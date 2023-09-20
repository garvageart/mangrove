import mongoose from "mongoose";

export interface ConnectToDbOptions {
    /**
     * MongoDB URI to connect to
     */
    uri: string;
    /**
     * MongoDB Database to connect to
     */
    dbName: string,
    /**
     * Number of times to retry connecting to MongoDB before the process exits
     * If no limit is specified, process will immediately exit after failing to connect
     */
    retryLimit?: number;
    /**
     * Amount of time in milliseconds to retry connecting to MongoDB before retrying to connect again
     * @default 5000 
     */
    retryTimeout?: number;
    /**
     * If connection to MongoDB fails to connect, use the localhost connection as a fallback
     */
    localFallback?: boolean;
    setCurrentConnection?: boolean;
}

export interface DBServiceOptions {
    schema?: mongoose.Schema;
    collectionName?: string;
    initializeModel?: boolean;
    localhostFallback?: boolean;
}

export interface BackupDatabaseOptions {
    localDatabase: string;
    archiveDirectory: string;
    database: string,
    username: string,
    password: string,
    host: string;
}