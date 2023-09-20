import crypto from 'crypto';

export type EncryptionAlgorithms = crypto.CipherCCMTypes | crypto.CipherGCMTypes | crypto.CipherOCBTypes;
// export type PossibleCiphers = crypto.CipherCCM | crypto.CipherGCM | crypto.CipherOCB;
// export type PossibleDeciphers = crypto.DecipherCCM | crypto.DecipherGCM | crypto.DecipherOCB;

export interface MuseSecurityKeys {
    SP_SECRET_KEY: string;
    SP_INITIAL_VECTOR: string;
    SP_AUTH_RT_TAG: string;
    SP_AUTH_AT_TAG: string;
}

export interface TestSecurityKeys {
    TEST_KEY: string;
}

export interface SecurityKeys {
    muse: MuseSecurityKeys;
}

export interface EncryptionResults {
    secretKey: string;
    initialVector: string;
    encryptedData: unknown[];
}

export interface CryptographerOptions {
    algorithm: EncryptionAlgorithms;
    authTagLength: number;
    keyStorage?: {
        path?: string;
        fileExtension?: string;
    };
    fileEncoding?: BufferEncoding;
    outputEncoding?: BufferEncoding;
}

export interface EncryptorOptions {
    secretKey?: string | Buffer,
    initialVector?: string | Buffer,
}

export interface DecryptorOptions {
    secretKey?: string | Buffer,
    initialVector?: string | Buffer,
    authTag?: NodeJS.ArrayBufferView | string | Buffer;
}

export interface MuseSpotifyAuthData {
    access_token: string;
    expires_in: number;
    refresh_token?: string | undefined;
    scope: string;
    token_type: string;
}