import chalk from "chalk";
import type { ChalkInstance } from "chalk";
import mongoose from "mongoose";
import Logger from "../logger";
import type { PluginDefinitionOptions } from "../types/plugins/plugins.types";
import { WebflowService } from "../services/webflow.service";
import { MONGODB_DEFAULT_PORT, IS_ENV, MONGODB_FALLBACK_LOCALLY } from "../globals";
import type { ConnectToDbOptions } from "../types/db.service";
import { msToSeconds, secondsToMs, sleep } from "../util";
import { DatabaseService } from "../services/db.service";

export default abstract class PluginInstance<FlowStateSchema, PluginInterface, ClientInterface>  {
    protected client: ClientInterface | undefined;
    protected colour: string;
    collectionName: string;
    logger: Logger;
    schema: mongoose.Schema;
    model: mongoose.Model<PluginInterface>;
    mongoConnection: mongoose.Connection;
    pluginColour: ChalkInstance;
    webflowService: WebflowService<FlowStateSchema>;
    dbs: DatabaseService<PluginInterface>;
    pluginName = this.constructor.name;

    /** 
     * @todo Find a way to infer types from addons that are added into the array.
     * For now we are guessing the type based on manually reading the type/inferface.
     * The code will still run as it's still valid JavaScript, but takes up time to correctly guess each addon type correctly.
     * 
     * Similar example of this idea can be found here: https://stackoverflow.com/questions/51879601/how-do-you-define-an-array-of-generics-in-typescript
 
     * The best way right now to clear the issue is to declare a variable with the addon
     * and use type assertions with the same arguments as the variable
  
     * @example
     * ````ts
     * // In the addOns array by constructor, declare your addon like so:
     * import sharp from 'sharp';
     * 
     * class YourPlugin extends PluginInstance<YourPluginInterface, typeof sharp> {
     *     constructor() {
     *         super({
     *             addOns: [
     *                 new Cryptographer({
     *                     algorithm: 'aes-256-ccm',
     *                     authTagLength: 16,
     *                     keyStorage: {
     *                         path: "./.example.keys"
     *                     }
     *                 })
     *             ]
     *         });
     *     }
     * }
     * 
     * // Then before using the addon, declare a variable with the addon:
     * const addon = this.addOns[0] as Cryptographer
     * ````
            
     * Code where this work is being done can be found in the [types definition file for plugin instances](../../src/types/plugins/plugins.types.d.ts) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addOns: any[];

    constructor(options: PluginDefinitionOptions<PluginInterface, ClientInterface>) {
        this.collectionName = options.collectionName;
        this.colour = options.colour;
        this.client = options.client;
        this.schema = options.schema;
        this.model = mongoose.model<PluginInterface>(this.collectionName, this.schema);
        this.addOns = options.addOns;

        this.webflowService = new WebflowService({
            collectionID: options.collectionID,
            siteID: process.env.WEBFLOW_SITE_ID,
        });

        this.dbs = new DatabaseService({
            collectionName: this.collectionName,
            schema: this.schema,
            localhostFallback: MONGODB_FALLBACK_LOCALLY
        });

        this.logger = new Logger(IS_ENV.production ? this.collectionName : this.pluginName, 'plugin');
        this.pluginColour = chalk.hex(this.colour);
    }

    async initializeMongoDBConnection(options: ConnectToDbOptions) {
        const kCreateConnection = async (kOptions: ConnectToDbOptions) => {
            return await mongoose.createConnection(`mongodb://${kOptions.uri}`, {
                user: process.env.MONGODB_USER,
                pass: process.env.MONGODB_PASS,
                dbName: options.dbName,
                serverSelectionTimeoutMS: IS_ENV.development ? secondsToMs(10) : secondsToMs(30),
                connectTimeoutMS: secondsToMs(30),
                socketTimeoutMS: secondsToMs(30),
                maxIdleTimeMS: secondsToMs(60),
                retryReads: true,
                retryWrites: true,
                maxPoolSize: 5
            }).asPromise().then((connection) => {
                this.logger.info(`New MongoDB connection established on '${options.uri}' at '${options.dbName}' for '${this.collectionName}`);

                return connection;
            });
        };

        let connection: mongoose.Connection;

        if (mongoose.connection.readyState === 1) {
            connection = mongoose.connection;

            if (options.setCurrentConnection) {
                this.mongoConnection = connection;
            }

            this.model = connection.model<PluginInterface>(this.collectionName, this.schema);

            return connection;
        }

        // const allMongooseConnections = mongoose.connections;
        // const connectionModelNames = allMongooseConnections.flatMap(connection => Object.keys(connection.models));
        // this.logger.debug(false, 'Model names:', connectionModelNames);

        // this.logger.info(`Connection on '${options.dbName}' at '${options.uri} already exists, using that instead`);

        // const existingConnection = allMongooseConnections.find(connection => Object.keys(connection.models).includes(this.collectionName));
        // connection = existingConnection;

        try {
            this.logger.info(`Connecting to '${options.dbName}' at '${options.uri}:${MONGODB_DEFAULT_PORT}'. Please wait...`);
            connection = await kCreateConnection(options);
        } catch (error) {
            let isConnected = false;
            const retryLimit = options.retryLimit;
            const retryCounterStart = 0;

            this.logger.error(`Error connecting to '${options.dbName}' at '${options.uri}'...`, error.toString());
            const timeToRetry = options.retryTimeout ?? 5000;

            for (let i = retryCounterStart; i < retryLimit + 1; i++) {
                this.logger.warn(`Retrying connection in ${msToSeconds(timeToRetry)} seconds...`);
                await sleep(timeToRetry);

                try {
                    this.logger.info(`Retrying connection to '${options.dbName}' at '${options.uri}:${MONGODB_DEFAULT_PORT}'. Please wait...`);
                    connection = await kCreateConnection(options);
                    isConnected = connection.readyState === 1;
                } catch (error) {
                    this.logger.error(`An error occurred while retrying connection to '${options.dbName}' at '${options.uri}'`, error.toString());
                }

                if (isConnected) {
                    break;
                }
            }

            if (isConnected) {
                if (options.setCurrentConnection) {
                    this.mongoConnection = connection;
                }

                this.model = connection.model<PluginInterface>(this.collectionName, this.schema);

                return connection;
            }

            if (!isConnected && options.localFallback === false) {
                const exitCode = 1;
                this.logger.fatal(`Error connecting to '${options.dbName}' at '${options.uri}' after retrying ${retryLimit} times. Exiting process with code ${exitCode}...`);

                process.exit(exitCode);
            }

            if (!isConnected && options.localFallback === true) {
                this.logger.info('Falling back to local MongoDB connection...');

                connection = await kCreateConnection({
                    uri: process.env.MONGODB_URI_LOCAL,
                    dbName: options.dbName
                });
            }
        }

        if (options.setCurrentConnection) {
            this.mongoConnection = connection;
        }

        this.model = connection.model<PluginInterface>(this.collectionName, this.schema);

        return connection;
    }

    async closeMongoDBConnection() {
        return await this.mongoConnection.close();
    }
}