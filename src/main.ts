import 'dotenv/config';
import inquirer from "inquirer";
import { GeneralLogger } from "./logger";
import { DatabaseService } from "./services/db.service";
import { IS_ENV, MONGODB_FALLBACK_LOCALLY } from "./globals";
import { ImaginePlugin } from "./plugins/imagine/imagine_processor";
import { WebflowService } from "./services/webflow.service";
import { forkChildProcess, getClassMethods } from "./util";
import MusePlugin from "./plugins/muse/muse_client";

const logger = GeneralLogger;

logger.info('Welcome to Mangrove CLI');

const database = new DatabaseService({
    initializeModel: false
});

await database.initializeDatabase({
    dbName: IS_ENV.production ? process.env.MONGODB_DEFAULT_DATABASE : 'HelloImSiera',
    uri: process.env.MONGODB_DOMAIN,
    retryLimit: 3,
    localFallback: MONGODB_FALLBACK_LOCALLY
});

// const processInactivityTimeSec = IS_ENV.production ? 300 : 60;

// function createInactivityTimeout(time: number) {
//     return setTimeout(() => {
//         process.on('beforeExit', async () => {
//             await database.disconnect();
//         });

//         logger.warn(`Process was inactive for ${time} seconds. Exiting main process...`);
//         process.exit(0);
//     }, secondsToMs(time));
// }

// let inactivityTimeout = createInactivityTimeout(processInactivityTimeSec);
const methodFilterRegEx = /"colour" | "mongo" | "connection"/;

process.stdin.on('keypress', async () => {
    // clearTimeout(inactivityTimeout);
    // inactivityTimeout = createInactivityTimeout(processInactivityTimeSec);
});

(async function main(): Promise<void> {
    async function registerCLIOptions(cliOption: object) {
        // clearTimeout(inactivityTimeout);

        const classMethods = getClassMethods(cliOption);

        const filteredMethods = classMethods.filter(method => methodFilterRegEx.test(method) === false);

        const cliPrompt = await inquirer.prompt({
            name: 'action',
            message: `What would you like to do in ${cliOption.constructor.name}?`,
            type: 'list',
            choices: filteredMethods
        });

        try {
            // Is there a better way to do this lmao? This looks so jank but it works
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await cliOption[cliPrompt.action]();
        } catch (error) {
            logger.error(`An error occurred while running ${cliPrompt.action}:`, logger.logError(error));
        }

        process.on('uncaughtException', (error) => {
            logger.error(`An uncaught exception occurred while running ${cliPrompt.action}:`, error);
        });

        // inactivityTimeout = createInactivityTimeout(processInactivityTimeSec);

        return await main();
    }

    process.stdin.on('keypress', async (ch, key) => {
        if (key && key.ctrl && key.name == 'b') {
            process.stdin.removeAllListeners('keypress');

            console.clear();

            // clearTimeout(inactivityTimeout);
            // inactivityTimeout = createInactivityTimeout(processInactivityTimeSec);

            return await main();
        }

        if (key && key.ctrl && key.name == 'e') {
            await database.disconnect();

            logger.warn(`Exiting main process...`);
            process.exit(0);
        }
    });

    process.stdin.setRawMode(true);

    const startPrompt = await inquirer.prompt({
        name: 'option',
        message: 'What would you like to use?',
        type: 'list',
        choices: ['Imagine', 'Muse', 'Webflow Service', 'Backup Database', 'Launch File Server', 'Launch Spotify Authorization Server', 'Exit']
    });

    switch (startPrompt.option) {
        case 'Webflow Service': {
            const webflow = WebflowService;

            await registerCLIOptions(new webflow({
                siteID: process.env.WEBFLOW_SITE_ID
            }));

            break;
        }
        case 'Imagine': {
            const imagine = ImaginePlugin;
            const processingQuality = IS_ENV.production ? 80 : 30;

            await registerCLIOptions(new imagine({ processingQuality }));

            break;
        }
        case 'Muse': {
            const muse = MusePlugin;

            await registerCLIOptions(new muse());

            break;
        }
        case 'Backup Database': {
            new DatabaseService().backUpDatabaseLocally({
                archiveDirectory: process.env.MONGODB_BACKUP_FILE,
                database: 'HelloImSiera',
                host: process.env.MONGODB_DOMAIN,
                localDatabase: 'HelloImSiera',
                password: process.env.MONGODB_PASS,
                username: process.env.MONGODB_USER
            });

            await main();

            break;
        }
        case 'Launch File Server': {
            forkChildProcess('src/plugins/imagine/imagine_server.ts', ['child'], {
                execArgv: ['--loader', 'tsx'],
                cwd: process.cwd(),
            }, logger);

            break;
        }
        case 'Launch Spotify Authorization Server': {
            forkChildProcess('src/plugins/muse/muse_auth_server.ts', ['child'], {
                execArgv: ['--loader', 'tsx'],
                cwd: process.cwd(),
            }, logger);

            break;
        }
        case 'Exit': {
            await database.disconnect();

            logger.warn(`Exiting main process...`);
            process.exit(0);
        }
    }
})();