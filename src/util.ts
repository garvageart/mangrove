import fs from 'fs/promises';
import { existsSync } from 'fs';
import util from 'util';
import child_process from 'child_process';
import type { IUploadToGCStorage, isNumberBetweenCompareValueReturnTypes, isNumberBetweenCompareValueSettings } from "./types/util.types";
import Logger, { GeneralLogger } from './logger';
import { NEW_LINE_REGEX } from './globals';
import crypto from 'crypto';
import stream from 'stream';

/**
 * Generates a randomized ID with a specified length.
 *
 * @example
 * ````
 * makePID(16) // Returns an ID as a string of characters, i.e. 'cHs3LBKYBoUVWR3F'
 * ````
 * @param {Number} idLength
 */
export function makePID(idLength: number) {
    let PID = '';

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < idLength; i++) {
        PID += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return PID;
}

/**
 * Simple algorithim to generate a random ID string with a specified number of characters
 * and a specified length for each type of character
 * @returns {String} The generated ID string
 */
export function generateRandomID(options: { numLength: number, idLength: number; }): string {

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    function loopThroughCharacters(characters: string, length: number) {
        let charID = '';

        for (let i = 0; i < length; i++) {
            const randomNumber = Math.floor(Math.random() * characters.length);
            charID += characters.charAt(randomNumber);
        }

        return charID;
    }

    /**
     * Randomly removes characters from a string
     * @param  {String} ID
     */
    function removeLetters(ID: string) {
        const strArray = ID.split('');

        for (let i = 0; i < options.numLength; i++) {
            strArray.splice(Math.floor(Math.random() * options.numLength), 1);
        }

        return strArray.join('');
    }

    const numID = loopThroughCharacters(numbers, options.numLength);
    const lettersID = loopThroughCharacters(lowercase + uppercase, options.idLength);
    const combinedID = lettersID + numID;
    const randomID = combinedID.split('').sort(() => Math.random() - Math.random()).join('');
    const generatedID = removeLetters(randomID);

    return generatedID;
}

/**
 * Generates a unique time-based ID
 * 
 * Original Code in this StackOverflow answer: https://stackoverflow.com/questions/3231459/how-can-i-create-unique-ids-with-javascript/34168882#comment128117339_53116778
 * 
 * @param length Desired length of ID
 * @license CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)
 */
export function generateUniqueTimeBasedID(): string {
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    const dateTimeID = Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9 * Math.pow(10, 12)).toString(36);

    let newString = dateTimeID.length === 16 ? dateTimeID : dateTimeID + possibleCharacters[Math.floor(Math.random() * possibleCharacters.length)];

    do {
        newString = newString.substring(0, newString.length - 1);
    } while (newString.length > 16);

    return newString;
}

/** 
 * Code from: https://stackoverflow.com/a/25690754/19047678
 */
function randomString(length: number, chars: string | unknown[]) {
    if (!chars) {
        throw new Error("Argument 'chars' is undefined");
    }

    const charsLength = chars.length;
    if (charsLength > 256) {
        throw new Error("Argument 'chars' should not have more than 256 characters"
            + ", otherwise unpredictability will be broken");
    }

    const randomBytes = crypto.randomBytes(length);
    const result = new Array(length);

    let cursor = 0;
    for (let i = 0; i < length; i++) {
        cursor += randomBytes[i];
        result[i] = chars[cursor % charsLength];
    }

    return result.join("");
}

/** Sync */
export function generateRandomASCII(length: number) {
    return randomString(length,
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
}

/**
 * Converts bytes to megabytes, rounded to 2 decimal places
 *
 * @example
 * ````
 * bytesToMB(8688852) // Returns '8.29' 
 * ````
 * @param {Number} bytes
 */
export function bytesToMB(bytes: number) {
    const MBSize = bytes / (1024 ** 2);
    return MBSize.toFixed(2);
}

/**
 * Converts seconds to milliseconds
 *
 * @example
 * ````
 * secondsToMs(120) // Returns 120000
 * ````
 * @param {Number} seconds
 */
export function secondsToMs(seconds: number) {
    return seconds * 1000;
}

/**
 * Converts minutes to milliseconds
 *
 * @example
 * ````
 * minutesToMs(5) // Returns 30000
 * ````
 * @param {Number} minutes
 */
export function minutesToMs(minutes: number) {
    return minutes * 60000;
}

/**
 * Converts milliseconds to seconds
 *
 * @example
 * ````
 * msToSeconds(5000) // Returns 5
 * ````
 * @param {Number} milliseconds
 */
export function msToSeconds(milliseconds: number) {
    return milliseconds / 1000;
}

/**
 * Pauses a process for a specified amount of time
 * @param {Number} time The amount of time to pause a process in milliseconds
 */
export const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

/**
 * Converts a date in EXIF format to a format that
 * can be parsed by the native ````Date```` object.
 * 
 * @param {String} EXIFDateTime A date in EXIF format that can be parsed by the function
 * @returns {Date} The parsed EXIF date as a native Date object
 */
export function convertEXIFDateTime(EXIFDateTime: string | null | undefined): Date | null {
    if (!EXIFDateTime) {
        return null;
    } else {
        const EXIFDate = EXIFDateTime?.split(" ")[0];
        const EXIFTime = EXIFDateTime?.split(" ")[1];

        const EXIFDateFormated = EXIFDate?.replaceAll(":", "/");

        const EXIFDateTimeString = `${EXIFDateFormated} ${EXIFTime}`;
        const EXIFDateObject = new Date(EXIFDateTimeString);

        return EXIFDateObject;
    }
}

/**
 * Parses the image file names in the specified format and returns
 * an object with all the metadata in the file name string
 * 
 * @param {String} fileName
 * @returns {Object} An object with all the metadata in the file name string
 */
export function parseImageFileName(fileName: string): object {
    const fileNameVariables = fileName.split("-");

    const parsedFileName = {
        siteName: fileNameVariables[0],
        category: fileNameVariables[1],
        fileNumber: fileNameVariables[2],
        fileMetadata: fileNameVariables[3].split("_"),
        get fileVersionNumber() { return this.fileMetadata[0]; },
        get fileImageQuality() { return this.fileMetadata[1].slice(16, 18); },
        get filePIDandDetails() { return this.fileMetadata[1].split(this.fileImageQuality); },
        get filePID() { return this.filePIDandDetails[0]; },
        get fileDateAndExtension() { return this.filePIDandDetails[1].split("."); },
        get fileExportDate() { return this.fileDateAndExtension[0]; },
        get fileExtension() { return this.fileDateAndExtension[1]; },
    };

    return parsedFileName;
}

/**
 * @todo Correct the check for ````equalTo```` check regardless if indiviual equals to checks are set to false
 * @param value 
 * @param min 
 * @param max 
 * @param equalTo 
 * @returns 
 */
export function numberIsBetween(
    value: number,
    min: isNumberBetweenCompareValueSettings,
    max: isNumberBetweenCompareValueSettings,
    equalTo?: boolean): isNumberBetweenCompareValueReturnTypes {

    let equalToResult: isNumberBetweenCompareValueReturnTypes;
    const compareValuesEqualToCheck = (!min.equalTo && !min.equalTo) ?? false;

    function checkRegardless() {
        if (value >= min.value && value <= max.value) {
            equalToResult = true;
        } else {
            equalToResult = false;
        }
    }

    if (compareValuesEqualToCheck) {
        if (min.equalTo && max.equalTo) {
            checkRegardless();
        } else if (!min.equalTo && max.equalTo) {

            if (value > min.value && value <= max.value) {
                equalToResult = true;
            } else {
                equalToResult = false;
            }

        } else if (min.equalTo && !max.equalTo) {

            if (value > min.value && value <= max.value) {
                equalToResult = true;
            } else {
                equalToResult = false;
            }

        }

        else if (!min.equalTo && !min.equalTo) {
            equalToResult = null;
        }
    } else if (!compareValuesEqualToCheck && equalTo) {
        checkRegardless();
    }

    if (equalToResult === null) {

        if (value > min.value && value < max.value) {
            return true;
        } else {
            return false;
        }

    }
}

// console.log(numberIsBetween(200, { value: 200 }, { value: 299 }, true));

/**
 * Replace function to convert circular structure object to JSON
 * 
 * Original code: https://careerkarma.com/blog/converting-circular-structure-to-json/
 * @returns Converted circular object to JSON
 */
export function convertCircularObject() {
    const visited = new WeakSet();

    return (key: string, value: object) => {
        if (typeof value === "object" && value !== null) {
            if (visited.has(value)) {
                return;
            }
            visited.add(value);
        }
        return value;
    };
}

export const removeANSI = (string: string) => util.stripVTControlCharacters(string);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findArrayDuplicates(array: any[]) {
    return array.filter((item, index) => array.indexOf(item) !== index);
}

export function logChildProcess(process: child_process.ChildProcess, logger: Logger) {
    process.stdout?.on('data', (chunk) => {
        logger.info(chunk.toString('utf-8'));
    });

    process.stderr?.on('data', (chunk) => {
        logger.warn(chunk.toString('utf-8'));
    });
}

export function logSyncChildProcess(childProcessOutput: child_process.SpawnSyncReturns<Buffer>, logger: Logger) {
    if (childProcessOutput.stdout) {
        logger.info(childProcessOutput.stdout.toString('utf-8'));
    }

    if (childProcessOutput.stderr) {
        logger.warn(childProcessOutput.stderr.toString('utf-8'));
    }
}

export async function readFileAndRemoveNewLine(path: string, encoding: BufferEncoding = 'utf-8') {
    if (!existsSync(path)) {
        return null;
    }

    const fileData = await fs.readFile(path, { encoding: encoding })
        .then(data => {
            const lastCharactersNewLine = NEW_LINE_REGEX.test(data[data.length - 1]) && !NEW_LINE_REGEX.test(data[data.length - 2]);
            if (lastCharactersNewLine) {
                // data.slice(0, -1) removes the extra new line (\r\n) characters from the end of the file
                data = data.slice(0, -1);

                return data;
            } else {
                return data;
            }
        });

    return fileData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateJSON(input: any) {
    if (input) {
        const object = JSON.parse(input);

        //validate the result too
        if (object && object.constructor === Object) {
            return true;
        }
        else {
            return false;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const forkChildProcess = (file: string, args: any[], forkOptions: child_process.ForkOptions, logger: Logger = GeneralLogger) => {
    const childProcess = child_process.fork(file, args, forkOptions);
    // childProcess.send({ type: 'parent_start_time', value: PROCESS_START_TIME });

    logChildProcess(childProcess, logger);

    return childProcess;
};

export function execChildProcess(command: string, logger: Logger = GeneralLogger) {
    const childProcess = child_process.exec(command);
    // childProcess.send({ type: 'parent_start_time', value: PROCESS_START_TIME });

    logChildProcess(childProcess, logger);

    return childProcess;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spawnChildProcess(command: string, args: any[], spawnOptions: child_process.SpawnOptionsWithoutStdio, logger: Logger = GeneralLogger) {
    const childProcess = child_process.spawn(command, args, spawnOptions);
    // childProcess.send({ type: 'parent_start_time', value: PROCESS_START_TIME });

    logChildProcess(childProcess, logger);

    return childProcess;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spawnChildProcessSync(command: string, args: any[], spawnOptions: child_process.SpawnSyncOptionsWithBufferEncoding, logger: Logger = GeneralLogger) {
    const childProcess = child_process.spawnSync(command, args, spawnOptions);

    logSyncChildProcess(childProcess, logger);

    return childProcess;
}

export function excludePropertiesFromObject(obj: object, exclude: Set<string>): Partial<object> {
    const filtered = Object.fromEntries(Object.entries(obj).filter(e => !exclude.has(e[0])));

    return filtered;
}

export function checkObjectEquality(original: object, comparer: object): boolean {
    return Object.entries(original).sort().toString() ===
        Object.entries(comparer).sort().toString();
}

export function parseSpotifyURL(url: string) {
    const parsedUrl = new URL(url);
    const parsedURLData = {
        host: parsedUrl.host,
        resourceData: parsedUrl.pathname.substring(1, parsedUrl.pathname.length).split('/'),
        get categoryID() {
            return this.resourceData[0];
        },
        get spotifyID() {
            return this.resourceData[1];
        }
    };

    return parsedURLData;
}

/**
 * Original code: https://stackoverflow.com/a/35033472/19047678
 * @param obj 
 * @returns 
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getClassMethods(obj: { [x: string]: any; }) {
    let props: string[] = [];

    do {
        const l = Object.getOwnPropertyNames(obj)
            .concat(Object.getOwnPropertySymbols(obj).map(s => s.toString()))
            .sort()
            .filter((p, i, arr) =>
                typeof obj[p] === 'function' &&  //only the methods
                p !== 'constructor' &&           //not the constructor
                (i == 0 || p !== arr[i - 1]) &&  //not overriding in this prototype
                props.indexOf(p) === -1          //not overridden in a child
            );
        props = props.concat(l);
    }
    while (
        (obj = Object.getPrototypeOf(obj)) &&   //walk-up the prototype chain
        Object.getPrototypeOf(obj)              //not the the Object prototype methods (hasOwnProperty, etc...)
    );

    return props;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeItemsFromArray(array: any[], value: any) {
    let i = 0;
    while (i < array.length) {
        if (array[i] === value) {
            array.splice(i, 1);
        } else {
            ++i;
        }
    }
    return array;
}

export function uploadToGCStorage(options: IUploadToGCStorage): Promise<stream.PassThrough> {
    const bucketFile = options.bucket.file(options.path);

    const passthroughStream = new stream.PassThrough();
    passthroughStream.write(options.data);
    passthroughStream.end();

    passthroughStream.pipe(bucketFile.createWriteStream(options.metadata));

    return new Promise((resolve, reject) => {
        passthroughStream.on('finish', () => {
            resolve(passthroughStream);
        });

        passthroughStream.on('error', (error) => {
            reject(error);
        });
    });
}