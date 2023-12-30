import chalk from 'chalk';
import inquirer from 'inquirer';
import mongoose from 'mongoose';
import Logger from '../logger';
import type { BackupDatabaseOptions, ConnectToDbOptions, DBServiceOptions } from '../types/db.service';
import { msToSeconds, secondsToMs, sleep, execChildProcess } from '../util';
import { MONGODB_DEFAULT_PORT, IS_ENV } from '../globals';

export class DatabaseService<DataInterface> {
    schema: mongoose.Schema;
    model: mongoose.Model<DataInterface>;
    collectionName: string;
    connection: mongoose.Connection;
    logger = new Logger('MongoDB Database Service', 'service');
    serviceColour = chalk.hex('#335F21');

    constructor(options: DBServiceOptions = { initializeModel: true }) {
        this.schema = options.schema;
        this.collectionName = options.collectionName;

        if (options.initializeModel !== false) {
            this.model = mongoose.model<DataInterface>(this.collectionName, this.schema);
        }
    }

    async createNewConnection(options: ConnectToDbOptions) {
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
                this.logger.info(`New MongoDB connection established on '${kOptions.uri}' at '${kOptions.dbName}' for '${this.collectionName}'`);

                return connection;
            });
        };

        let connection: mongoose.Connection;
        let isConnected = false;

        if (mongoose.connection.readyState === (99 || 0)) {
            connection = mongoose.connection;

            this.connection = connection;
            this.model = connection.model<DataInterface>(this.collectionName, this.schema);

            return connection;
        }

        if (process.argv.includes('localDb')) {
            this.logger.info(`Connecting to '${options.dbName}' on localhost. Please wait...`);
            connection = await kCreateConnection({
                uri: process.env.MONGODB_URI_LOCAL,
                dbName: options.dbName
            });

            this.model = connection.model<DataInterface>(this.collectionName, this.schema);
            this.connection = connection;

            return connection;
        }

        try {
            this.logger.info(`Connecting to '${options.dbName}' at '${options.uri}:${MONGODB_DEFAULT_PORT}'. Please wait...`);
            connection = await kCreateConnection(options);

            this.model = connection.model<DataInterface>(this.collectionName, this.schema);
            this.connection = connection;
            isConnected = connection.readyState === 1;

        } catch (error) {
            isConnected = false;
            const retryLimit = options.retryLimit;
            const retryCounterStart = 0;

            this.logger.error(`Error connecting to '${options.dbName}' at '${options.uri}'...`, error.toString());
            const timeToRetry = options.retryTimeout ?? 5000;

            for (let i = retryCounterStart; i < retryLimit + 1; i++) {
                this.logger.error(`Retrying connection in ${msToSeconds(timeToRetry)} seconds...`);
                await sleep(timeToRetry);

                try {
                    this.logger.info(`Retrying connection to '${options.dbName}' at ${options.uri}:${MONGODB_DEFAULT_PORT}'. Please wait...`);
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
                return connection;
            }

            if (!isConnected && options.localFallback === false) {
                const exitCode = 1;
                this.logger.fatal(`Error connecting to '${options.dbName}' at '${options.uri}' after retrying ${retryLimit} times. Exiting process with code ${exitCode}...`);

                process.exit(exitCode);
            }

            if (!isConnected && options.localFallback === true) {
                this.logger.warn('Falling back to local MongoDB connection...');

                connection = await kCreateConnection({
                    uri: process.env.MONGODB_URI_LOCAL,
                    dbName: options.dbName
                });

                this.model = connection.model<DataInterface>(this.collectionName, this.schema);
                this.connection = connection;
            }
        }

        return connection;
    }

    private async connectToDB(options: ConnectToDbOptions) {
        return await mongoose.connect(`mongodb://${options.uri}`, {
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASS,
            dbName: options.dbName,
            serverSelectionTimeoutMS: IS_ENV.development ? secondsToMs(10) : secondsToMs(30),
            connectTimeoutMS: secondsToMs(30),
            socketTimeoutMS: secondsToMs(30),
            maxIdleTimeMS: secondsToMs(60),
            heartbeatFrequencyMS: secondsToMs(10),
            retryReads: true,
            retryWrites: true,
            maxPoolSize: 5
        }).then((mongooseInstance) => {
            if (mongooseInstance.connection.readyState === 1) {
                this.logger.info(`Successfully connected to '${options.dbName}' at ${options.uri}:${MONGODB_DEFAULT_PORT}'`);
            }

            this.connection = mongooseInstance.connection;
            return mongooseInstance;
        });
    }

    /**
     * Connects to a MongoDB a specified URI and database
     * @param options Options for connecting to the database
     */
    async initializeDatabase(options: ConnectToDbOptions) {
        const isDefaultConnected = mongoose.connection.readyState === 1;
        const retryLimit = options.retryLimit;

        try {
            this.logger.info(`Connecting to '${options.dbName}' at '${options.uri}:${MONGODB_DEFAULT_PORT}'. Please wait...`);
            return await this.connectToDB(options);
        } catch (error) {
            const caughtError = error as mongoose.MongooseError;

            this.logger.error(`Error connecting to '${options.dbName}' at '${options.uri}'...`, caughtError.message, '\n' + caughtError.stack);
            const timeToRetry = options.retryTimeout ?? 5000;

            for (let retryCounter = 0; retryCounter < retryLimit; retryCounter++) {
                this.logger.error(`Retrying connection in ${msToSeconds(timeToRetry)} seconds...`);
                await sleep(timeToRetry);

                await this.connectToDB(options)
                    .catch(error => {
                        this.logger.error(`An error occurred while retrying connection '${options.dbName}' at '${options.uri}'`, error.message, `\n${error.stack}`);
                    });

                if (isDefaultConnected) {
                    break;
                }
            }
        }

        if (isDefaultConnected) {
            return mongoose;
        }

        if (!isDefaultConnected && options.localFallback === false) {
            const exitCode = 1;
            this.logger.fatal(`Error connecting to '${options.dbName}' at '${options.uri}' after retrying ${retryLimit} times. Exiting process with code ${exitCode}...`);

            process.exit(exitCode);
        }

        if (!isDefaultConnected && options.localFallback === true) {
            this.logger.info('Falling back to local MongoDB connection...');

            return this.connectToDB({
                uri: process.env.MONGODB_URI_LOCAL,
                dbName: options.dbName
            });
        }

    }

    async initializeModel(): Promise<mongoose.Model<DataInterface>> {
        const createdModel = mongoose.model<DataInterface>(this.collectionName, this.schema);
        return createdModel;
    }

    async addDocument(documentData: DataInterface) {
        return new this.model(documentData).save() as unknown as mongoose.Document & DataInterface;
    }

    async updateDocument(filterQuery: mongoose.FilterQuery<DataInterface>, updateQuery: mongoose.UpdateQuery<DataInterface> | DataInterface) {
        return this.model.findOneAndUpdate(filterQuery, updateQuery);
    }

    async deleteDocument(filterQuery: mongoose.FilterQuery<DataInterface>) {
        return this.model.findOneAndDelete(filterQuery);
    }

    async removeCollection(collectionName?: string) {
        let selectedCollectionName = collectionName ?? this.collectionName;

        if (!selectedCollectionName) {
            const prompt = await inquirer.prompt({
                name: 'emptyName',
                type: 'confirm',
                message: `There is no specified collection name, would you like to enter it in?`
            });

            if (prompt.emptyName === true) {
                const prompt = await inquirer.prompt({
                    name: 'collectionName',
                    type: 'input',
                    message: `Please enter the collection name`
                });

                selectedCollectionName = prompt.collectionName;
            } else {
                return;
            }

        }

        const prompt = await inquirer.prompt({
            name: 'deleteCollection',
            type: 'confirm',
            message: `Are you sure you want to delete the ${selectedCollectionName} collection?`
        });

        if (prompt.deleteCollection === true) {
            this.logger.info(`Deleting ${this.serviceColour(selectedCollectionName)} collection. Please wait...`);

            await this.connection.dropCollection(selectedCollectionName);
            this.logger.info(`${selectedCollectionName} has been deleted from the database`);

            return;
        } else {
            this.logger.info(`${selectedCollectionName} will not be deleted from the database`);
            return;
        }
    }

    async closeConnection() {
        return await this.connection.close();
    }

    async disconnect() {
        await mongoose.disconnect()
            .then(() => this.logger.info('Successfully disconnected from the database!'))
            .catch(err => this.logger.error('There was an error disconnecting', err));
    }

    /**
     * 
     * @deprecated
     */
    async backUpDatabaseLocally(options: BackupDatabaseOptions) {
        const mongodump = execChildProcess(
            `mongodump mongodb://${options.host}:${MONGODB_DEFAULT_PORT} --db ${options.database} --username ${options.username} --password ${options.password} --authenticationDatabase admin  --out ${options.archiveDirectory} '--archive`,
            this.logger
        );

        mongodump.on('error', (error) => {
            this.logger.fatal(`MongoDB Backup failed. ${options.database} could not be backed up. Exiting parent process`, error);
            process.exit(1);
        });

        mongodump.on('exit', (code) => {
            if (code !== 0) {
                this.logger.error(`MongoDB Backup failed. ${options.database} could not be backed up`);
                return;
            }

            this.logger.info(`MongoDB backup completed. Process exited with code ${code}`);
            this.logger.info('Launching mongorestore and importing backup data onto local machine');

            execChildProcess(
                `mongorestore --port ${MONGODB_DEFAULT_PORT} --db ${options.localDatabase} --username ${options.username} --password ${options.password} --authenticationDatabase admin --archive --dir ${options.archiveDirectory}`,
                this.logger
            );
        });
    }
}