import type { Bucket, CreateWriteStreamOptions } from "@google-cloud/storage";

export interface isNumberBetweenCompareValueSettings {
    value: number;
    equalTo?: boolean;
}

export type isNumberBetweenCompareValueReturnTypes = boolean | undefined | null;

export interface IUploadToGCStorage {
    bucket: Bucket,
    path: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    metadata?: CreateWriteStreamOptions;
}