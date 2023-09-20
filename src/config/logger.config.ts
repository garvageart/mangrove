/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from "chalk";
import type { ChalkInstance } from "chalk";

export interface LoggingFileFormat {
    format: string;
}

export interface LoggingLevelConstructorOptions {
    levelName: string;
    colour: string;
    level: number;
    emoji?: string;
}

export type LoggerType = 'plugin' | 'service' | 'addon' | 'general' | 'test';

export interface FastifyRequestSimple {
    id: string;
    statusCode: number;
    protocol: string;
    ip: string;
    method: string;
    responseTime: number;
    params: object;
    query: object;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any | undefined;
    url: string;
    ips: string[] | undefined;
    timeout: number;
    peername: {
        address: string,
        family: string,
        port: number,
    };
    statusMessage: string;
    httpVersion: string;
}

export class LoggingLevel {
    colour: string;
    levelName: string;
    nameStyled: string;
    emoji: string;
    level: number;
    levelColour: ChalkInstance;

    constructor(options: LoggingLevelConstructorOptions) {
        this.colour = options.colour;
        this.level = options.level;
        this.levelName = options.levelName;
        this.nameStyled = ` ${this.level} ${this.levelName} `;
        this.emoji = options.emoji;

        this.levelColour = chalk.hex(this.colour);
    }

    levelNameColour = () => {
        // Handle level name styling depending on the terminal.
        // Windows Terminal does not read well with the default styling, so we don't use the background colouring
        const baseLevelName = process.env.WT_SESSION ? this.levelColour : chalk.bgHex(this.colour);
        const nameStyled = process.env.WT_SESSION ? this.nameStyled.toUpperCase().trim() : this.nameStyled.toUpperCase();

        return baseLevelName.bold(nameStyled);
    };
}

export interface LoggingOptions {
    trace?: boolean,
    formats?: LoggingFileFormat[],
    logLevel?: LoggingLevel;
}

export interface LoggingMetadata {
    date: string | Date;
    pid: number;
    environment: string | undefined;
    version: string;
    platform: string;
    level: number;
    levelName: string;
    loggerType: LoggerType | string;
    emoji: string;
    message: any;
    fileFormats: LoggingFileFormat[];
    optionalMessages: any[];
    errorStack?: string;
}

export interface ProcessLoggerTime {
    type: string;
    value: string | number;
}

export const logLevels = {
    fatal: new LoggingLevel({ levelName: 'FATAL', colour: '#FF0000', level: 0, emoji: '⚰️' }),
    error: new LoggingLevel({ levelName: 'ERROR', colour: '#F9D63D', level: 1, emoji: '🚨' }),
    warn: new LoggingLevel({ levelName: 'WARN', colour: '#FCB205', level: 2, emoji: '⚠️' }),
    debug: new LoggingLevel({ levelName: 'DEBUG', colour: '#05BAFC', level: 3, emoji: '🖥️' }),
    trace: new LoggingLevel({ levelName: 'TRACE', colour: '#E809E4', level: 4, emoji: '📃' }),
    info: new LoggingLevel({ levelName: 'INFO', colour: '#12DB5C', level: 5, emoji: 'ℹ️' }),
    silly: new LoggingLevel({ levelName: 'SILLY', colour: '#FC05D7', level: 6, emoji: '😋' })
};

interface BaseLoggerConfig {
    baseDirectory?: string;
    fileFormats?: LoggingFileFormat[];
}

const BaseLoggerConfig: BaseLoggerConfig = {
    baseDirectory: 'logs',
    fileFormats: [
        {
            format: 'json'
        }
    ]
};

export default BaseLoggerConfig;