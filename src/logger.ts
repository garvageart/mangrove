/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import dayjs from 'dayjs';
import path from 'path';
import pino from 'pino';
import chalk from 'chalk';
import { mkdirpSync } from "mkdirp";
import { APP_VERSION, FORMATTED_DATES, IS_ENV, IS_PROCESS_CHILD, PROCESS_START_TIME } from './globals';
import { convertCircularObject, removeANSI } from './util';
import BaseLoggerConfig, { logLevels } from './config/logger.config';
import type { LoggerType, FastifyRequestSimple, LoggingMetadata, LoggingOptions, ProcessLoggerTime } from './config/logger.config';

/** Only call a log time for the process' logging directory once and store use that time throughout the logger,
 *  as opposed to calling ````FORMATTED_DATES.CURRENT_TIME_LOG()```` multiple times
 */
let permanantLogDirectoryTime = PROCESS_START_TIME;

if (IS_PROCESS_CHILD) {
    process.on('message', (message) => {
        const processMessage = message as ProcessLoggerTime;
        const isLoggerMessage = Object.hasOwn(processMessage, 'type') && Object.hasOwn(processMessage as unknown as object, 'value');

        if (isLoggerMessage) {
            permanantLogDirectoryTime = processMessage.value as string;
        }
    });
}

/**
 * @todo Rewrite logger to be able to add more features and levels without getting way too verbose
 * and repeating logging matters multiple times
 */
export default class Logger {
    name: string;
    loggerType?: LoggerType | undefined;

    constructor(name: string, loggerType?: LoggerType) {
        this.name = name;
        this.loggerType = loggerType;
    }

    private formatLogDirectory() {
        const logDirectorySubdirectories = [
            FORMATTED_DATES.SINGLE_VALUES.YEAR.toString(),
            FORMATTED_DATES.SINGLE_VALUES.MONTH.toString(),
            FORMATTED_DATES.SINGLE_VALUES.DAY.toString(),
            permanantLogDirectoryTime
        ];

        if (this.loggerType === 'test') {
            logDirectorySubdirectories.push('tests');
        }

        return path.resolve(BaseLoggerConfig.baseDirectory, ...logDirectorySubdirectories);
    }

    logDirectory = this.formatLogDirectory();

    protected log(
        options: LoggingOptions,
        message: any,
        ...optionalMessages: any[]) {

        // If we are in production, don't log any debug messages
        if (IS_ENV.production && options.logLevel.levelName.toLowerCase() === 'debug') {
            return;
        }

        const environment = process.env.NODE_ENV ?? 'development';

        const errorStack = new Error(`${this.name} Stack Trace`).stack;
        const errorStackString = options.trace ? errorStack : "";

        const metadataSeperator = "::";
        const loggerNameVerifier = this.name.toLowerCase();

        // Structured logging metadata
        const loggingMetadata: LoggingMetadata = {
            date: FORMATTED_DATES.CURRENT_DATETIME_LOG_CONSOLE(),
            pid: process.pid,
            environment: environment,
            version: APP_VERSION.versionString,
            platform: process.platform,
            level: options.logLevel.level,
            levelName: options.logLevel.levelName,
            loggerType: this.loggerType?.toLowerCase() ?? 'general',
            emoji: options.logLevel.emoji,
            fileFormats: options.formats,
            message: message,
            optionalMessages: [...optionalMessages]
        };

        const prettyPrintFastify = Boolean(process.env.LOGGER_PRETTY_PRINT_FASTIFY);
        const isMessageObject = typeof loggingMetadata.message === "object";

        // Convert circular object to JSON before logging
        if (isMessageObject) {
            // Destructure Fastify requests to a simpler object
            if (loggerNameVerifier.includes('fastify')) {
                const fastifyData = loggingMetadata.message;

                // Don't log base64 image strings
                let requestBody = fastifyData.res?.request.body;
                if (requestBody && requestBody.includes('base64') && requestBody.includes('image')) {
                    requestBody = JSON.parse(requestBody);

                    const base64meta = requestBody.dataURL.split(',')[0];
                    requestBody.dataURL = base64meta;

                    requestBody = JSON.stringify(requestBody);
                }

                const fastifyReq: FastifyRequestSimple | undefined = {
                    id: fastifyData.res?.request.id,
                    statusCode: fastifyData.res?.raw?.statusCode,
                    protocol: fastifyData.res?.request.protocol,
                    ip: fastifyData.res?.request.ip,
                    method: fastifyData.res?.request.method,
                    responseTime: fastifyData?.responseTime,
                    params: fastifyData.res?.request.params,
                    query: fastifyData.res?.request.query,
                    body: requestBody,
                    url: fastifyData.res?.request.url,
                    ips: fastifyData.res?.request.ips,
                    timeout: fastifyData.res?.request.socket.timeout ?? fastifyData.res?.request.connection.timeout,
                    peername: fastifyData.res?.request.socket._peername ?? fastifyData.res?.request.connection._peername,
                    statusMessage: fastifyData.res?.raw?.statusMessage,
                    httpVersion: fastifyData.res?.raw.req?.httpVersion
                };

                let fastifyRequestDataFormatted: string | FastifyRequestSimple = fastifyReq;

                if (prettyPrintFastify && fastifyReq !== undefined) {
                    fastifyRequestDataFormatted = `${fastifyReq?.ip} - [${FORMATTED_DATES.CURRENT_DATETIME_LOG_CONSOLE()}] ${fastifyReq?.responseTime} ${fastifyReq?.protocol?.toUpperCase()}/${fastifyReq?.httpVersion} ${fastifyReq?.statusCode} ${fastifyReq?.method} "${fastifyReq?.url}"`;
                }

                const fastifyDataToLog = !fastifyData.res ? "No data to log" : fastifyRequestDataFormatted;
                loggingMetadata.message = fastifyDataToLog;

            } else {
                loggingMetadata.message = JSON.stringify(loggingMetadata.message, convertCircularObject());
            }
        }

        const prettyPrintedMessage = typeof loggingMetadata.message === 'object' ? JSON.stringify(loggingMetadata.message, convertCircularObject()) : loggingMetadata.message;
        const prettyPrintedOptionalMessages = loggingMetadata.optionalMessages.map(message => {
            if (typeof message === 'object') {
                return JSON.stringify(message, convertCircularObject());
            }

            return message;
        });

        let prettyPrintedLogString = `${this.name} ${metadataSeperator} ${loggingMetadata.pid} ${metadataSeperator} ${loggingMetadata.environment} ${metadataSeperator} ${loggingMetadata.version} ${metadataSeperator} ${loggingMetadata.platform} ${metadataSeperator} [${loggingMetadata.date}] ${options.logLevel.nameStyled.trim()} ${loggingMetadata.emoji.trim()} ${metadataSeperator} ${loggingMetadata.loggerType.toUpperCase()} ${metadataSeperator} "${prettyPrintedMessage}" ${prettyPrintedOptionalMessages.join(' ')}\n`;

        // Add trace stack to logging metadata and pretty printed log string if trace is enabled
        if (options.trace) {
            Object.defineProperty(loggingMetadata, "errorStack", {
                writable: true,
                value: errorStackString
            });

            // Add the stack trace to the file string on a new line.
            // Two new line characters are added for better readability in log files
            prettyPrintedLogString += loggingMetadata.errorStack + '\n\n';
        }

        const loggerNameFileNameFormated = this.name.replaceAll(' ', '_').replaceAll('-', '_');

        /**
         * Create log file and directory for specific data storage types
         * @param fileFormat File format to store data in
         * @param data Data to store (in any valid format)
         */
        const kAddFileFormatData = (fileFormat: string, data: any) => {
            const fileFormatDirectory = path.resolve(this.logDirectory, fileFormat);

            mkdirpSync(fileFormatDirectory);

            fs.appendFile(path.resolve(fileFormatDirectory, `${loggerNameFileNameFormated}.${fileFormat}.log`), data, { encoding: 'utf8' });
            fs.appendFile(path.resolve(fileFormatDirectory, `main.${fileFormat}.log`), data, { encoding: 'utf8' });
        };

        // Handle data for each type of data stated in the array
        for (const fileFormat of BaseLoggerConfig.fileFormats) {
            if (loggerNameVerifier.includes('fastify') && fileFormat.format.includes('json')) {

                // Handling JSON data from Fastify
                kAddFileFormatData(fileFormat.format, JSON.stringify({
                    loggerName: this.name,
                    metadata: loggingMetadata
                }, convertCircularObject()) + '\n');

            } else
                if (fileFormat.format === 'json') {

                    // Handle logging data as JSON
                    kAddFileFormatData(fileFormat.format, removeANSI(JSON.stringify({
                        loggerName: this.name,
                        metadata: loggingMetadata
                    }, convertCircularObject())) + '\n');

                } else {
                    kAddFileFormatData(fileFormat.format, loggingMetadata);
                }
        }

        // Write log data to human readable and pretty printed log files
        const loggerNameFilePath = path.resolve(this.logDirectory, `${loggerNameFileNameFormated}.log`);
        // ----------------------------------------------------------------
        // Write log data for specific logger
        fs.appendFile(loggerNameFilePath, removeANSI(prettyPrintedLogString));
        fs.appendFile(path.resolve(this.logDirectory, 'main.log'), removeANSI(prettyPrintedLogString));

        // Determine how data is written to the console/terminal
        const consoleMessage = typeof loggingMetadata.message === "string" ? options.logLevel.levelColour(loggingMetadata.message) : loggingMetadata.message;
        const consoleoptionalMessages = loggingMetadata.optionalMessages.map(message => {
            if (typeof message === 'string') {
                return chalk.magentaBright(message);

            } else if (typeof message === 'boolean') {
                return chalk.cyanBright(message);

            } else if (dayjs(message).isValid() && typeof message !== 'number' && message !== undefined) {
                return chalk.yellow(message);
            }

            return message;
        });
        const versionNumberColour = chalk.hex('#1DDEAE')(loggingMetadata.version);

        // Log all data to console
        const consoleParams = [
            this.name, metadataSeperator,
            loggingMetadata.pid, metadataSeperator,
            versionNumberColour, metadataSeperator,
            `[${loggingMetadata.date}]`, options.logLevel.levelNameColour(),
            options.logLevel.emoji, metadataSeperator,
            this.loggerType.toUpperCase(), metadataSeperator,
            consoleMessage, ...consoleoptionalMessages
        ];

        // Add error stack to console parameters if trace is enabled in options
        if (options.trace) {
            consoleParams.push('\n' + chalk.gray(loggingMetadata.errorStack));
        }

        // Append new line character to console parameters
        consoleParams.push('\n');

        // Determine how the console message is displayed depending on the log level
        switch (options.logLevel.levelName.toLowerCase()) {
            case "trace":
                console.trace(...consoleParams);
                break;
            case "error":
                console.error(...consoleParams);
                break;
            case "debug":
                console.debug(...consoleParams);
                break;
            default:
                console.log(...consoleParams);
        }
    }

    logError(error: Error | unknown) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return '\n' + error.stack;
    }

    info(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.info
        }, message, ...optionalMessages);
    }

    debug(trace = true, message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.debug,
            trace: trace
        }, message, ...optionalMessages);
    }

    silly(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.silly
        }, message, ...optionalMessages);
    }

    warn(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.warn
        }, message, ...optionalMessages);
    }

    error(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.error
        }, message, ...optionalMessages);
    }

    fatal(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.fatal
        }, message, ...optionalMessages);
    }
}

export class FastifyLogger extends Logger {
    constructor() {
        super("Fastify Client", "addon");
    }

    trace(message: any, ...optionalMessages: any[]) {
        this.log({
            logLevel: logLevels.trace
        }, message, ...optionalMessages);
    }

    child(...args: any[]) {
        const child = Object.create(this);
        child.pino = pino().child(args);

        return child;
    }
}

export const GeneralLogger = new Logger('General Logger', 'general');