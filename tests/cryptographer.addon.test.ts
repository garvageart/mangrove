import Cryptographer from "../src/addons/cryptographer.addon";
import { TestSecurityKeys } from "../src/types/addons/cryptographer.addon";
import { sleep } from "../src/util";
import { testLogger } from "./util";

const testCryptographer = new Cryptographer<TestSecurityKeys>({
    algorithm: 'aes-256-ccm',
    authTagLength: 16,
    fileEncoding: 'utf-8',
    keyStorage: {
        path: './.keys.test',
        fileExtension: 'json'
    }
});

const testCryptographerSecretKey = 'TEST_SECRET_KEY';
const testCryptographerIV = 'TEST_INITIAL_VECTOR';
const testCryptographerMessageKey = 'TEST_MESSAGE';
const testCryptographerValueUnencrypted = 'This is an unencrypted test message';
// let uncryptedText: string;

beforeAll(async () => {
    testLogger.info('Creating secret key and initial vector');

    const secretKey = await testCryptographer.createSecretKey();
    const initialVector = await testCryptographer.createInitialVector();

    await testCryptographer.storeKey(testCryptographerSecretKey, secretKey.toString('hex'));
    await testCryptographer.storeKey(testCryptographerIV, initialVector.toString('hex'));
});

describe('Cryptographer Addon', () => {

    test('Use secret key and initial vector to encrypt and unencrypt data', async () => {
        const encryptedMessage = testCryptographer.encrypt(testCryptographerValueUnencrypted);
        await testCryptographer.storeKey(testCryptographerMessageKey, encryptedMessage.encryptedData);

        testLogger.info('Pausing process for two seconds, before reading from file');
        await sleep(2000);

        const singleStoredValue = await testCryptographer.getStoredKey(testCryptographerMessageKey);
        const unencryptedMessage = testCryptographer.decrypt(singleStoredValue);

        expect(unencryptedMessage).toBe(testCryptographerValueUnencrypted);
    });

    test('Replace a key in the file', async () => {
        testLogger.info('Before replacing the message, expect the old message to still exist');

        const oldEncryptedMessage = await testCryptographer.getStoredKey(testCryptographerMessageKey);
        const oldUnencryptedMessage = testCryptographer.decrypt(oldEncryptedMessage);

        expect(oldUnencryptedMessage).toBe(testCryptographerValueUnencrypted);

        const newUncryptedMessage = 'This is a new unencrypted message';

        const newEncryptedMessage = testCryptographer.encrypt(newUncryptedMessage);
        await testCryptographer.storeKey(testCryptographerMessageKey, newEncryptedMessage.encryptedData);

        testLogger.info('Pausing process for two seconds, before reading from file');
        await sleep(2000);

        const singleStoredValue = await testCryptographer.getStoredKey(testCryptographerMessageKey);
        const unencryptedMessage = testCryptographer.decrypt(singleStoredValue);

        expect(unencryptedMessage).not.toBe(testCryptographerValueUnencrypted);
        expect(unencryptedMessage).toBe(newUncryptedMessage);
    });

    test('Remove a key from the file', async () => {
        await testCryptographer.removeKey(testCryptographerMessageKey);

        const nonExistantKey = await testCryptographer.getStoredKey(testCryptographerMessageKey);

        expect(nonExistantKey).toBeFalsy();
        expect(nonExistantKey).toBeUndefined();
    });
});

afterAll(() => {
    testLogger.info('Removing test key storage file');
    testCryptographer.removeKeyStorageFile();

    testLogger.info('Test key storage file has been removed');
});