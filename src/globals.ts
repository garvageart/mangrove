import dayjs from "dayjs";
import fs from "fs";
import type packageJSON from '../package.json';

/**
* Various formatted date strings for logging 
* 
* @example
* ````
* DATES.CURRENT_DATE_LOG_CONSOLE(); // Returns 27-08-2022 17:40:03
* DATES.CURRENT_DATE_LOG_FILE(); // Returns 27082022-174003
* DATES.CURRENT_DATE_LOG_OUTPUT(); // Returns 27082022174003
* DATES.CURRENT_TIME_LOG(); // Returns 17:40:03
* ````
*/
export const IS_ENV = {
    production: process.env.NODE_ENV === 'production',
    development: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'debug',
    test: process.env.NODE_ENV === 'test'
};

export const FORMATTED_DATES = {
    SINGLE_VALUES: {
        DAY: dayjs().date(),
        CONVERT_MONTH: () => {
            const month = dayjs().month() + 1;
            if (month < 10) {
                return `0${month}`;
            }
            return month;
        },
        get MONTH() {
            return this.CONVERT_MONTH();
        },
        YEAR: dayjs().year()
    },
    CURRENT_DATE: dayjs().format('DD_MM_YYYY'),
    CURRENT_DATETIME_FILE: () => dayjs().format('DDMMYYYYHHmmss'),
    CURRENT_DATETIME_LOG_FILE: () => dayjs().format('DDMMYYYY-HHmmss'),
    CURRENT_DATETIME_LOG_CONSOLE: () => dayjs().format('DD-MM-YYYY HH:mm:ss'),
    CURRENT_TIME_LOG: () => dayjs().format('HH_mm_ss')
};

/**
 * Object containing methods and properties for the current application version
 * 
 * @example
 * ````
 * console.log(appVersion.versionString); // Prints v1.2.0
 * ````
 */
export const APP_VERSION = {

    /**
     * Reads the package.json file and returns the ````version```` property
     * as an array Semantic Version numbers
     * @returns An array containing the major, minor and patch values in the package.json
     */
    getAppVersion(): string[] {
        const metadata = JSON.parse(fs.readFileSync('package.json').toString()) as typeof packageJSON;
        return metadata.version.split('.');
    },

    /**
     * @property The semantic version text stored in the package.json file
     */
    get versionString(): string {
        return 'v' + this.getAppVersion().join(".");
    },

    /**
     * @property An object containing the major, minor and patch numbers 
     */
    get numbers() {
        return {
            major: this.getAppVersion()[0],
            minor: this.getAppVersion()[1],
            patch: this.getAppVersion()[2]
        };
    }
};

export const NEW_LINE_REGEX = /[\n\r]/;
export const URL_VALID_CHARACTERS = /[^a-zA-Z0-9-_]/g;

export const MONGODB_DEFAULT_PORT = 27017;
export const MONGODB_DEFAULT_DATABASE = process.env.MONGODB_DEFAULT_DATABASE;
export const MONGODB_FALLBACK_LOCALLY = IS_ENV.production ? false : true;

export const IS_PROCESS_CHILD = process.argv.includes('child');

export const PROCESS_START_TIME = FORMATTED_DATES.CURRENT_TIME_LOG();