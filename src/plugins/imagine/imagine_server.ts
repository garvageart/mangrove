import dayjs from 'dayjs';
import path from 'path';
import fastifyStatic from '@fastify/static';
import type { ListDir, ListFile } from '@fastify/static';
import { fastifyImageClient } from "../../config/clients.config";
import { APP_VERSION, IS_ENV } from '../../globals';
import type { ImagineServerOptions, ImagineServerParams } from '../../types/plugins/imagine.types';
import { bytesToMB } from '../../util';
import { ImaginePlugin } from './imagine_processor';

const isAuthServerChildProcess = process.argv.includes('child');

export default class ImagineFileServer extends ImaginePlugin {
    serverOptions: ImagineServerOptions;

    constructor(serverOptions: ImagineServerOptions) {
        super();
        this.serverOptions = serverOptions;

        if (serverOptions.prettyPrintFastify) {
            process.env.LOGGER_PRETTY_PRINT_FASTIFY = "true";
        }
    }

    private rootDirectory = path.resolve(process.cwd(), this.baseDirectory);

    private renderDirectoryHTML(name: string, dirs: ListDir[], files: ListFile[]) {
        const dirsHTML = dirs.length !== 0 ? dirs.map(dir => `<tr><td><a href="${dir.href}">${dir.name}</a></td><td align="right">${dayjs(dir.extendedInfo.lastModified).format('DD-MM-YYYY HH:mm')}</td><td align="right">&nbsp;</td><td align="right">${bytesToMB(dir.extendedInfo.totalSize)}MB</td></tr>`).join('') : "";
        const filesHTML = files.map(file => `<tr><td><a href="${file.href}">${file.name}</a></td><td align="right">${dayjs(file.stats.atime).format('DD-MM-YYYY HH:mm')}</td><td align="right">&nbsp;</td><td align="right">${bytesToMB(file.stats.size)}MB</td></tr>`).join('');

        const dataToRender = (dirs.length === 0 && files.length === 0) ? 'Nothing to show here :(' :
            `
            <table>
                <tbody>
                    <tr>
                        <th>Name</th>
                        <th>Last Modified</th>
                        <th align="right"></th>
                        <th>Size</th>
                    </tr>
                    <tr>
                        <th colspan="5"><hr></th>
                    </tr>
                        ${dirsHTML}${filesHTML}
                    <tr>
                        <th colspan="5"><hr></th>
                    </tr>
                </tbody>
            </table>`;

        return `
            <html>
                <body>
                    <h1>${name}</h1>
                    ${dataToRender}
                </body>
            </html>`;
    }

    start() {
        fastifyImageClient.register(fastifyStatic, {
            root: this.rootDirectory,
            prefixAvoidTrailingSlash: true,
            prefix: '/images',
            dotfiles: 'deny',
            serveDotFiles: false,
            list: {
                format: 'html',
                extendedFolderInfo: true,
                render: (dirs, files) => this.renderDirectoryHTML(this.collectionName, dirs, files)
            }
        });

        fastifyImageClient.get(`/export/${APP_VERSION.versionString}/:category/:name`, (req, res) => {
            const params = req.params as ImagineServerParams;
            res.sendFile(path.resolve('export', params.category, params.name));
        });

        fastifyImageClient.get(`/source/${APP_VERSION.versionString}/:category/:name`, (req, res) => {
            const params = req.params as ImagineServerParams;
            res.sendFile(path.resolve('source', params.category, params.name));
        });

        fastifyImageClient.get('/', (req, res) => {
            res.redirect(302, '/images/export');
        });

        fastifyImageClient.listen({ port: this.serverOptions.serverPort, host: '0.0.0.0', }, (error) => {
            if (error) {
                this.logger.error('An error occured running the server:', error);
            }

            this.logger.info(`Image file server is up and running. Listening for requests`);
        });

        return fastifyImageClient;
    }
}

if (isAuthServerChildProcess) {
    const fileServer = new ImagineFileServer({
        serverPort: parseInt(process.env.ASSETS_SERVER_PORT),
        prettyPrintFastify: IS_ENV.production ? false : true,
    });

    process.on('uncaughtException', (err) => {
        fileServer.logger.error('Uncaught exception on the child process:', err);
        process.send(err);
    });

    fileServer.start();
}