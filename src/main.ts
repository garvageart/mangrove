import 'dotenv/config';
import inquirer from "inquirer";
import { GeneralLogger } from "./logger";
import { DatabaseService } from "./services/db.service";
import { IS_ENV, MONGODB_FALLBACK_LOCALLY } from "./globals";
import { ImaginePlugin } from "./plugins/imagine/imagine_processor";
import { WebflowService } from "./services/webflow.service";
import { forkChildProcess, getClassMethods } from "./util";
import MusePlugin from "./plugins/muse/muse_client";
import { L2W_EDITOR_HREF, L2W_EDITOR_URL } from "./plugins/left-2-write/l2w.constants";
import type child_process from "child_process";
import { L2WServer } from "./plugins/left-2-write/server/l2w_client";

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

database.connection.on('open', () => {
    logger.info('Opened connection to MongoDB for mangrove');
});

database.connection.on('disconnected', () => {
    logger.warn('Mangrove has disconnected from MongoDB, continuously polling for reconnection in the background');
});

// This currently doesn't work as it should, needs to be fixed
const methodFilterRegEx = /("colour"|"mongo"|"connection")/ig;

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
            logger.warn(`An error occurred while running ${cliPrompt.action}:`, logger.logError(error));
        }

        process.on('uncaughtException', (error) => {
            logger.warn(`An uncaught exception occurred while running ${cliPrompt.action}:`, error);
        });


        return await main();
    }

    const childProcesses: child_process.ChildProcess[] = [];

    process.stdin.on('keypress', async (ch, key) => {
        if (key && key.ctrl && key.name == 'b') {
            process.stdin.removeAllListeners('keypress');
            process.removeAllListeners();

            childProcesses.forEach(process => process?.kill(1));
            console.clear();

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
        choices: ['Imagine', 'Muse', 'Left-2-Write', 'Webflow Service', 'Launch File Server', 'Launch Spotify Authorization Server', 'Exit']
    });

    switch (startPrompt.option) {
        case 'Webflow Service': {
            const webflow = WebflowService;

            registerCLIOptions(new webflow({
                siteID: process.env.WEBFLOW_SITE_ID
            }));

            break;
        }

        case 'Imagine': {
            const imagine = ImaginePlugin;
            const processingQuality = IS_ENV.production ? 80 : 30;

            registerCLIOptions(new imagine({ processingQuality }));

            break;
        }

        case 'Muse': {
            const muse = MusePlugin;

            registerCLIOptions(new muse());

            break;
        }

        case 'Left-2-Write': {
            const left2Write = new L2WServer({
                port: 7777
            });

            left2Write.runL2WServer();
            logger.info(`Open Leaf editor at ${left2Write.pluginColour(IS_ENV.production ? L2W_EDITOR_URL : L2W_EDITOR_HREF)}`);

            break;
        }

        case 'Launch File Server': {
            const fileServerProcess = forkChildProcess('src/plugins/imagine/imagine_server.ts', ['child'], {
                execArgv: ['--import', 'tsx'],
                cwd: process.cwd(),
            }, logger);

            childProcesses.push(fileServerProcess);

            break;
        }

        case 'Launch Spotify Authorization Server': {
            const spotifyServerProcess = forkChildProcess('src/plugins/muse/muse_auth_server.ts', ['child'], {
                execArgv: ['--import', 'tsx'],
                cwd: process.cwd(),
            }, logger);

            childProcesses.push(spotifyServerProcess);

            break;
        }

        case 'Exit': {
            await database.disconnect();

            logger.warn(`Exiting main process...`);
            process.exit(0);
        }
    }
})();