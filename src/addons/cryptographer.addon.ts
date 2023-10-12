import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync, rmSync } from 'fs';
import type { CryptographerOptions, DecryptorOptions, EncryptionAlgorithms, EncryptorOptions } from '../types/addons/cryptographer.addon';
import Logger from '../logger';
import { readFileAndRemoveNewLine } from '../util';
import { NEW_LINE_REGEX } from '../globals';

export default class Cryptographer<StoredKeys>{
    algorithm: EncryptionAlgorithms;
    secretKey: Buffer | crypto.CipherKey;
    initialVector: Buffer | crypto.BinaryLike;
    authTag: Buffer;

    private authTagLength: number;
    private keyStoragePath: string | undefined;
    private fileEncoding: BufferEncoding;
    private outputEncoding: BufferEncoding;
    protected logger = new Logger("Cryptographer", "addon");

    constructor(options: CryptographerOptions) {
        this.algorithm = options.algorithm;
        this.authTagLength = options.authTagLength;
        this.keyStoragePath = `${options.keyStorage.path || '.keys'}.${(options.keyStorage?.fileExtension?.replaceAll('.', '') || 'json')}`;
        this.fileEncoding = options.fileEncoding;
        this.outputEncoding = options.outputEncoding;
    }

    async createSecretKey() {
        let algorithmByteLength: number;

        if (this.algorithm === 'chacha20-poly1305') {
            algorithmByteLength = 256 / 8;
        } else {
            const algorithmData = this.algorithm.split('-');
            algorithmByteLength = parseInt(algorithmData[1]) / 8;
        }

        const secretKey = crypto.randomBytes(algorithmByteLength);
        this.secretKey = secretKey;

        return secretKey;
    }

    async createInitialVector() {
        const initialVector = crypto.randomBytes(12);
        this.initialVector = initialVector;

        return initialVector;
    }

    convertToBuffer(data: string) {
        return Buffer.from(data, this.fileEncoding ?? 'hex');
    }

    removeKeyStorageFile() {
        rmSync(this.keyStoragePath);
        this.logger.info(`${this.keyStoragePath} has been removed`);
    }

    /**
     * 
     * @param encoding 
     * @returns 
     * @deprecated Use {@link readKeys} instead
     */
    async readKeysFromFile(encoding: BufferEncoding = this.fileEncoding || 'utf-8') {
        const fileData = await readFileAndRemoveNewLine(this.keyStoragePath, encoding);

        if (!fileData) {
            return null;
        } else {
            const allKeyValues: unknown[] = [];

            fileData.split(NEW_LINE_REGEX).forEach(pair => {
                const keyValue = JSON.parse(pair);
                allKeyValues.push(keyValue);
            });

            return allKeyValues;
        }
    }

    private async readKeys(encoding: BufferEncoding = this.fileEncoding || 'utf-8') {
        const fileData = await readFileAndRemoveNewLine(this.keyStoragePath, encoding);

        if (fileData === '') {
            return null;
        } else {
            const allKeyValues = JSON.parse(fileData);

            return allKeyValues;
        }
    }

    /**
     * 
     * @param key 
     * @param value 
     * @param encoding 
     * @returns 
     * @deprecated use {@link storeKey} instead
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async addKeyToFile(key: string, value: any, encoding = this.fileEncoding || 'utf-8') {
        const fileExists = existsSync(this.keyStoragePath);
        this.logger.info(`${this.keyStoragePath} existence status:`, fileExists);
        this.logger.info(`Key to add to to file:`, `${key}:${value}`);

        const returnObject = { key, value };

        const kWriteKeyValue = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const keyValueObject: any = {};
            keyValueObject[key as keyof typeof keyValueObject] = value;

            await fs.appendFile(this.keyStoragePath, JSON.stringify(keyValueObject) + '\n', { encoding: encoding });

            return returnObject;
        };

        if (!fileExists) {
            this.logger.info(`Key storage file doesn't exist. Creating file ${this.keyStoragePath}...`);
            return kWriteKeyValue();
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const storedKeyValues: any[] = await this.readKeysFromFile();

            const allStoredKeys: string[] | undefined = storedKeyValues?.flatMap(keyValues => Object.keys(keyValues));
            const isKeyStored = allStoredKeys?.includes(key);

            // Create a new Object and set the property as the key/value pair
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const keyValueToAdd: any = {};
            keyValueToAdd[key as keyof typeof keyValueToAdd] = value;

            /**
             * The array which we will store the key/value pairs and at the end
             * of checking all the key/value pairs, write it into the defined file
             */
            const tempStore = [];

            if (!storedKeyValues) {
                return await kWriteKeyValue();
            }

            if (!isKeyStored) {
                // Add the new key/value to the temp store if the key isn't stored
                tempStore.push(keyValueToAdd);
            }

            // Looping through all the stored keys now to see if anything needs replacing
            for (let i = 0; i < storedKeyValues.length; i++) {
                const keyValue = storedKeyValues[i];
                const storedKey = Object.keys(keyValue)[0];
                const isKeyEqualToStoredKey = key === storedKey;

                if (isKeyEqualToStoredKey) {
                    // Change the value of the object first
                    // and then add it to the temp storage array
                    keyValue[storedKey] = value;
                    tempStore.push(keyValue);
                } else {
                    // Do nothing to the object, just add it to the temp storage array
                    tempStore.push(keyValue);
                }
            }

            // Clear the file so we can add the data in the temp storage into it
            await fs.writeFile(this.keyStoragePath, "", encoding);

            for (const keyValue of tempStore) {
                this.logger.info(`Adding ${JSON.stringify(keyValue)} to file ${this.keyStoragePath}`);
                await fs.appendFile(this.keyStoragePath, JSON.stringify(keyValue) + '\n', encoding);
            }

            return returnObject;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async storeKey(key: string, value: any, encoding = this.fileEncoding || 'utf-8') {
        const fileExists = existsSync(this.keyStoragePath);
        this.logger.info(`${this.keyStoragePath} existence status:`, fileExists);
        this.logger.info(`Key to add to to file:`, `${key}: ${value}`);

        const returnObject = { key, value };

        /**
         * Create a new Object and set the property as the key/value pair.
         * This is the Object where we will store all they key/value pairs before
         * writing them into the file */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const keyValueObject: any = {};

        const kWriteKeyValue = async () => {
            keyValueObject[key as keyof typeof keyValueObject] = value;
            await fs.appendFile(this.keyStoragePath, JSON.stringify(keyValueObject), { encoding: encoding });

            return returnObject;
        };

        if (!fileExists) {
            this.logger.info(`Key storage file doesn't exist. Creating file ${this.keyStoragePath}...`);
            return kWriteKeyValue();
        }

        const storedKeyValues = await this.readKeys();

        if (storedKeyValues === ('' || null)) {
            return await kWriteKeyValue();
        }

        const allKeys = Object.keys(storedKeyValues);
        const allValues = Object.values(storedKeyValues);
        const isKeyStored = allKeys?.includes(key);

        if (!isKeyStored) {
            // Add the new key/value pair to the keyValueObject
            keyValueObject[key as keyof typeof keyValueObject] = value;
        }

        // Looping through all the stored keys now to see if anything needs replacing
        for (let i = 0; i < allKeys.length; i++) {
            const storedKey = allKeys[i];
            const storedValue = allValues[i];

            const isKeyEqualToStoredKey = key === storedKey;

            if (isKeyEqualToStoredKey) {
                // Change the value of the property
                keyValueObject[key as keyof typeof keyValueObject] = value;
            } else {
                keyValueObject[storedKey as keyof typeof keyValueObject] = storedValue;
            }

        }

        // Clear the file so we can add the new key/value pairs into the file
        await fs.writeFile(this.keyStoragePath, "", encoding);

        this.logger.info(`Adding the following keys to the file ${this.keyStoragePath}:`, keyValueObject);
        await fs.appendFile(this.keyStoragePath, JSON.stringify(keyValueObject), encoding);

        return returnObject;
    }

    /**
     * 
     * @param key 
     * @param encoding
     * @deprecated use {@link removeKey} instead 
     */
    async removeKeyFromStorage(key: string, encoding = this.fileEncoding || 'utf-8') {
        const storedKeyValues = await this.readKeysFromFile();
        const fileExists = existsSync(this.keyStoragePath);

        if (fileExists && storedKeyValues !== null) {
            for (let i = 0; i < storedKeyValues.length; i++) {
                const keyValue = storedKeyValues[i];
                const storedKey = Object.keys(keyValue)[0];

                if (key === storedKey) {
                    storedKeyValues.splice(i, 1);

                    await fs.writeFile(this.keyStoragePath, "", { encoding: encoding });
                    for (const keyValue of storedKeyValues) {
                        await fs.appendFile(this.keyStoragePath, JSON.stringify(keyValue) + "\n", { encoding: encoding });
                    }

                    break;
                }
            }
        } else {
            if (!fileExists) {
                throw new Error(`Unable to remove key '${key}' from storage`, { cause: `${this.keyStoragePath} does not exist` });
            }
        }
    }

    async removeKey(key: string, encoding = this.fileEncoding || 'utf-8') {
        const storedKeyValues = await this.readKeys();
        const fileExists = existsSync(this.keyStoragePath);

        const allKeys = Object.keys(storedKeyValues);

        if (fileExists && storedKeyValues !== null) {
            for (let i = 0; i < allKeys.length; i++) {
                const currentKey = allKeys[i];

                if (key === currentKey) {
                    delete storedKeyValues[key as keyof typeof storedKeyValues];

                    await fs.writeFile(this.keyStoragePath, "", { encoding: encoding });
                    await fs.appendFile(this.keyStoragePath, JSON.stringify(storedKeyValues), { encoding: encoding });

                    break;
                }
            }
        } else if (!fileExists) {
            throw new Error(`Unable to remove key '${key}' from storage`, { cause: `${this.keyStoragePath} does not exist` });
        }

    }

    async getAllStoredKeys() {
        const allKeysValues = await this.readKeys();

        if (!allKeysValues) {
            return null;
        }

        return allKeysValues as StoredKeys;
    }

    async getStoredKey(key: string) {
        const allKeysObject = await this.getAllStoredKeys();

        return allKeysObject[key as keyof typeof allKeysObject];
    }

    encrypt(data: string, options?: EncryptorOptions) {
        if (options && typeof options.secretKey === 'string') {
            options.secretKey = Buffer.from(options.secretKey, this.outputEncoding ?? 'hex');
        }

        if (options && typeof options.initialVector === 'string') {
            options.initialVector = Buffer.from(options.initialVector, this.outputEncoding ?? 'hex');
        }

        const secretKey = this.secretKey ?? options?.secretKey;
        const initialVector = this.initialVector ?? options?.initialVector;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const cipher = crypto.createCipheriv(this.algorithm, secretKey, initialVector, { authTagLength: this.authTagLength || 16 });
        const encryptedData = cipher.update(data, 'utf-8', this.outputEncoding ?? 'hex') + cipher.final(this.outputEncoding ?? 'hex');
        const authTag = cipher.getAuthTag();

        if (!this.authTag) {
            this.authTag = authTag;
        }

        return { encryptedData, authTag };
    }

    decrypt(data: string, options?: DecryptorOptions) {
        if (options && typeof options.secretKey === 'string') {
            options.secretKey = Buffer.from(options.secretKey, this.outputEncoding ?? 'hex');
        }

        if (options && typeof options.initialVector === 'string') {
            options.initialVector = Buffer.from(options.initialVector, this.outputEncoding ?? 'hex');
        }

        if (options && typeof options.authTag === 'string') {
            options.authTag = Buffer.from(options.authTag, this.outputEncoding ?? 'hex');
        }

        const secretKey = this.secretKey ?? options?.secretKey;
        const initialVector = this.initialVector ?? options?.initialVector;
        const authTag = this.authTag ?? options?.authTag as Buffer;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const decipher = crypto.createDecipheriv(this.algorithm, secretKey, initialVector, { authTagLength: this.authTagLength });
        decipher.setAuthTag(authTag);

        const decryptedData = decipher.update(data, this.outputEncoding ?? 'hex', 'utf-8') + decipher.final('utf-8');

        return decryptedData;
    }
}

// const testCrypto = new Cryptographer<MuseSecurityKeys>({
//     algorithm: 'aes-256-ccm',
//     authTagLength: 16,
//     outputEncoding: 'hex',
//     keyStorage: {
//         path: "./.test.keys"
//     }
// });

// const someText = 'Hello I am some text';
// console.log('inital text:', someText);

// const key = crypto.randomBytes(32);

// const iv = crypto.randomBytes(12);

// const cipher = crypto.createCipheriv('aes-256-ccm', key, iv, { authTagLength: 16 });

// let encrypted = cipher.update(someText, 'utf8', 'hex');
// encrypted += cipher.final('hex');

// const authTag = cipher.getAuthTag();

// console.log('I am encrypted', encrypted);

// const decipher = crypto.createDecipheriv('aes-256-ccm', key, iv, { authTagLength: 16 });

// decipher.setAuthTag(authTag);

// let decrypted = decipher.update(encrypted, 'hex', 'utf8');
// decrypted += decipher.final('utf8');


// console.log('I am decrypted', decrypted);

// ----------------------------------------------------------------
// ----------------------------------------------------------------
// ----------------------------------------------------------------

// console.log('Deleting file');
// testCrypto.removeKeyStorageFile();

// await sleep(2000);

// const secretKey = await testCrypto.createSecretKey();
// const initialVector = await testCrypto.createInitialVector();

// await testCrypto.storeKey("SP_SECRET_KEY", secretKey.toString('hex'));
// await testCrypto.storeKey("SP_INITIAL_VECTOR", initialVector.toString('hex'));

// await sleep(2000);

// const testData = 'Hello this is some test data';
// // const keys = await testCrypto.getAllStoredKeys();

// const encryptedText = testCrypto.encrypt(testData, {
//     secretKey: secretKey,
//     initialVector: initialVector,
// });

// console.log('This is the encrypted text', encryptedText.encryptedData);

// // await sleep(2000);

// const decryptedText = testCrypto.decrypt(encryptedText.encryptedData, {
//     secretKey: secretKey,
//     initialVector: initialVector,
//     authTag: encryptedText.authTag
// });
// console.log('This is the decrypted text', decryptedText);