import mongoose from 'mongoose';
import inquirer from 'inquirer';
import type child_process from 'child_process';
import type SpotifyWebApi from 'spotify-web-api-node';
import { spotifyClient } from '../../config/clients.config';
import { MUSE_DB_CONNECTION_DEFAULTS, Muse, SpotifyAuth } from '../../config/db.config';
import Cryptographer from '../../addons/cryptographer.addon';
import { DatabaseService } from '../../services/db.service';
import type { IMuseSpotifyAuth, IMuseSpotify, MuseOptions, FlowStateMuse } from '../../types/plugins/muse.types';
import PluginInstance from '../plugin_instance';
import type { MuseSecurityKeys, MuseSpotifyAuthData } from '../../types/addons/cryptographer.addon';
import { forkChildProcess, generateRandomID, parseSpotifyURL, secondsToMs } from '../../util';
import { IS_ENV, URL_VALID_CHARACTERS } from '../../globals';
import type { AxiosError } from '../../../node_modules/axios/index';

export default class MusePlugin extends PluginInstance<FlowStateMuse, IMuseSpotify, SpotifyWebApi> {
    tempServer: child_process.ChildProcess;
    authenticationStatus: boolean;
    protected options: MuseOptions;
    protected authData: MuseSpotifyAuthData;

    constructor(options?: MuseOptions) {
        super({
            colour: "#1DB954",
            schema: Muse,
            collectionName: "muse-collections",
            client: spotifyClient,
            addOns: [
                new DatabaseService<IMuseSpotifyAuth>({
                    schema: SpotifyAuth,
                    collectionName: "muse-authorization-info"
                }),
                new Cryptographer<MuseSecurityKeys>({
                    algorithm: 'aes-256-ccm',
                    authTagLength: 16,
                    outputEncoding: 'hex',
                    keyStorage: {
                        path: IS_ENV.production ? "./.muse.keys" : "./.test.muse.keys"
                    }
                })
            ]
        });

        this.options = options;
    }

    async reauthenticate() {
        const refreshTokenPrompt = await inquirer.prompt({
            name: 'getNewToken',
            message: 'Would you like to reauthenticate?',
            type: 'confirm'
        });

        if (refreshTokenPrompt.getNewToken === false) {
            this.logger.warn('Will not launch reauthenticate server');
            return;
        }

        this.logger.info('Launching temporary authentication server. Please wait...');

        const tempServer = forkChildProcess('src/plugins/muse/muse_auth_server.ts', ['child'], {
            execArgv: ['--loader', 'tsx'],
            cwd: process.cwd(),
        }, this.logger);

        this.tempServer = tempServer;

        tempServer.on('spawn', () => {
            this.logger.info(`Authentication server launched successfully`);
        });

        tempServer.on('message', (message) => {
            const isSpotifyData = Object.hasOwn(message as unknown as object, 'body');
            const isTSXmessage = Object.hasOwn(message as unknown as object, 'type') && Object.hasOwn(message as unknown as object, 'path');

            if (isTSXmessage) {
                return;
            }

            if (isSpotifyData) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const authData = message.body as MuseSpotifyAuthData;

                this.authData = authData;
            }
        });

        tempServer.on('exit', (code) => {
            if (code !== 0) {
                this.logger.info('An error occurred while running the authentication server and exited with code:', code);
                return;
            }

            this.authenticationStatus = true;
            this.logger.info(`Temporary authentication server has been closed successfully with code ${code}`);

            return;
        });

        return tempServer;
    }

    async getAuthData(): Promise<MuseSpotifyAuthData> {
        let authData: MuseSpotifyAuthData;

        const dbAuth = this.addOns[0] as DatabaseService<IMuseSpotifyAuth>;
        const spotifyCryptographer = this.addOns[1] as Cryptographer<MuseSecurityKeys>;

        // TODO: Catch errors when cryptographer is not able to handle or decrypt anything tokens,
        // likely asking for reauthentication
        const securityKeys = await spotifyCryptographer.getAllStoredKeys();

        const authDataConnection = await dbAuth.createNewConnection(MUSE_DB_CONNECTION_DEFAULTS);
        const dbAuthData = (await dbAuth.model.findOne().sort({ sp_auth_expires_date: -1 }).limit(1))?.toObject();

        if (!dbAuthData) {
            this.logger.error('There is no authentication data stored locally');

            return null;
        }

        if (!securityKeys) {
            this.logger.error('There are no security keys, please reauthenticate');

            return null;
        }

        spotifyCryptographer.secretKey = spotifyCryptographer.convertToBuffer(securityKeys.SP_SECRET_KEY);
        spotifyCryptographer.initialVector = spotifyCryptographer.convertToBuffer(securityKeys.SP_INITIAL_VECTOR);

        let decryptedRefreshToken: string;
        let decryptedAccessToken: string;

        try {
            decryptedRefreshToken = spotifyCryptographer.decrypt(dbAuthData.sp_auth_refresh_token, {
                authTag: securityKeys.SP_AUTH_RT_TAG
            });

            decryptedAccessToken = spotifyCryptographer.decrypt(dbAuthData.sp_auth_access_token, {
                authTag: securityKeys.SP_AUTH_AT_TAG
            });
        } catch (error) {
            this.logger.error('An error occurred while attempting to decrypt the stored keys:', this.logger.logError(error));
        }

        const accessTokenExpiresDate = dbAuthData.sp_auth_expires_date;
        const currentDateTimeMS = Date.now();
        const currentDateTime = new Date();

        if (currentDateTime > accessTokenExpiresDate) {
            this.logger.warn('Access token has expired, requesting a new access token');
            this.client.setRefreshToken(decryptedRefreshToken);
            const newAccessTokenAuthData = await this.client.refreshAccessToken();

            const responseCode = newAccessTokenAuthData.statusCode;

            if (responseCode === 401) {
                this.logger.error('Refresh token has likely expired!', newAccessTokenAuthData);
                const tempServer = await this.reauthenticate();

                tempServer.on('exit', async () => {
                    return await this.getAuthData();
                });
            }

            authData = newAccessTokenAuthData.body;

            const encryptedRefreshToken = newAccessTokenAuthData?.body?.refresh_token ? spotifyCryptographer.encrypt(authData.refresh_token).encryptedData : dbAuthData.sp_auth_refresh_token;

            const encryptedAccessToken = spotifyCryptographer.encrypt(authData.access_token);
            await spotifyCryptographer.storeKey('SP_AUTH_AT_TAG', encryptedAccessToken.authTag.toString('hex'));

            const accessTokenExpiresDate = new Date(currentDateTimeMS + authData.expires_in * 1000);

            const savedAuthData = await dbAuth.addDocument({
                sp_auth_access_token: encryptedAccessToken.encryptedData,
                sp_auth_refresh_token: encryptedRefreshToken,
                sp_auth_authorized_at: currentDateTime,
                sp_auth_expires_date: accessTokenExpiresDate,
                sp_auth_refresh_token_changed: authData?.refresh_token ? true : false,
                sp_auth_state: dbAuthData.sp_auth_state,
                sp_auth_scope: authData?.scope,
                sp_auth_token_type: authData?.token_type
            });

            this.logger.info(`Spotify access token has been changed and been saved to the database. Access token expires at ${savedAuthData.sp_auth_expires_date}`);

            await authDataConnection.close()
                .then(() => this.logger.info(`Temporary MongoDB connection for Spotify Authorization ${this.pluginColour.italic(`(${dbAuth.collectionName})`)} has been closed`))
                .catch((error) => this.logger.error('There was an error closing the MongoDB connection:', error));

        } else {
            this.logger.info('Spotify access token does not need to be refreshed right now');
            this.logger.info(`Access token expires in ${Math.round((+dbAuthData.sp_auth_expires_date - +new Date()) / 1000)} seconds at ${dbAuthData.sp_auth_expires_date}`);
        }

        const accessToken = authData?.access_token ?? decryptedAccessToken;

        await authDataConnection.close()
            .then(() => this.logger.info(`Temporary MongoDB connection for Spotify Authorization ${this.pluginColour.italic(`(${dbAuth.collectionName})`)} has been closed`))
            .catch((error) => this.logger.error('There was an error closing the MongoDB connection:', error));

        if (!accessToken) {
            this.logger.fatal('Access token has still not been found');
            process.exit(1);
        }

        this.authData = authData;

        if (!authData) {
            authData = {
                access_token: accessToken,
                refresh_token: authData?.refresh_token ?? decryptedRefreshToken,
                scope: authData?.scope ?? dbAuthData.sp_auth_scope,
                token_type: authData?.token_type ?? dbAuthData.sp_auth_token_type,
                expires_in: authData?.expires_in ?? Math.round((+dbAuthData.sp_auth_expires_date - +new Date()) / 1000)
            };

            this.authData = authData;
        }

        return authData;
    }

    async initializeSpotify() {
        let authData = await this.getAuthData();

        const isSuccessfullyAuthenticated = authData ? true : false;
        this.authenticationStatus = isSuccessfullyAuthenticated;

        if (!isSuccessfullyAuthenticated) {
            this.logger.error('Unable to successfully find authentication data');

            const tempServer = await this.reauthenticate();

            tempServer.on('exit', () => {
                authData = this.authData;

                this.client.setRefreshToken(authData?.refresh_token);
                this.client.setAccessToken(authData?.access_token);
            });

            return this.client;
        }

        this.client.setRefreshToken(authData?.refresh_token);
        this.client.setAccessToken(authData?.access_token);

        return this.client;

    }

    async getPlaylists(playlistLimit: number): Promise<SpotifyApi.PlaylistObjectSimplified[]> {
        const userData = await this.client.getMe();

        const listOfPlaylists = await this.client.getUserPlaylists(userData.body.id, { limit: playlistLimit });
        const playlistData = listOfPlaylists.body.items;

        return playlistData;
    }

    async addPlaylistToDatabase() {
        this.initializeMongoDBConnection(MUSE_DB_CONNECTION_DEFAULTS);

        const dbStoredPlaylists = await this.model.find();
        const dbStoredPlaylistIDs = dbStoredPlaylists.map(playlist => playlist.sp_playlist_id);

        const playlistURLList: string[] = [];
        async function enterPlaylist(): Promise<void> {
            const playlistAnswer = await inquirer.prompt({
                name: 'playlistPrompt',
                message: 'Please enter the Spotify playlist URL:',
                type: 'input'
            });

            playlistURLList.push(playlistAnswer.playlistPrompt);

            const addPlaylistAnswer = await inquirer.prompt({
                name: "addMorePlaylistCheck",
                type: "confirm",
                message: "Would you like to add another playlist?"
            });

            if (addPlaylistAnswer.addMorePlaylistCheck === true) {
                return await enterPlaylist();
            }
        }

        await enterPlaylist();

        for (const playlistURL of playlistURLList) {
            const parsedSpotifyURL = parseSpotifyURL(playlistURL);

            if (dbStoredPlaylistIDs.includes(parsedSpotifyURL.spotifyID)) {
                this.logger.info(`Spotify playlist with ID '${parsedSpotifyURL.spotifyID}' already exists in the database`);
                continue;
            }

            this.logger.info(`Fetching playlist data from Spotify for '${playlistURL}'...`);
            const playlistData = await this.client.getPlaylist(parsedSpotifyURL.spotifyID)
                .then(response => response.body);
                
            if (!playlistData.description) {
                playlistData.description = "";
            }

            await this.dbs.addDocument({
                _id: new mongoose.Types.ObjectId(),
                sp_playlist_api_url: playlistData.href,
                sp_playlist_collaborative: playlistData.collaborative,
                sp_playlist_description: playlistData.description,
                sp_playlist_href: playlistData.external_urls.spotify,
                sp_playlist_id: playlistData.id,
                sp_playlist_name: playlistData.name,
                sp_playlist_snapshot_id: playlistData.snapshot_id,
                sp_playlist_total_tracks: playlistData.tracks.total,
                sp_playlist_owner: playlistData.owner,
                sp_playlist_track_data: playlistData.tracks.items.map(item => item.track),
                sp_playlist_uri: playlistData.uri,
                sp_playlist_local_id: generateRandomID({ numLength: 5, idLength: 24 })
            }).then((document) => this.logger.info(`Spotify playlist ${this.pluginColour.italic(`${document.sp_playlist_name} - ${document.sp_playlist_href}`)} has been added to the local database`))
                .catch(error => this.logger.error('An error occured adding the Webflow Collection to database:', error));
        }

        if (mongoose.connection.readyState === (99 || 0)) {
            await this.closeMongoDBConnection()
                .then(() => this.logger.info(`MongoDB connection has been closed`))
                .catch((error) => this.logger.error('There was an error closing the MongoDB connection:', error.toString()));
        }
    }

    async uploadPlaylists() {
        this.initializeMongoDBConnection(MUSE_DB_CONNECTION_DEFAULTS);

        const webflowCollections = await this.webflowService.getAllCollections();
        const radioCollection = webflowCollections.find(collections => collections.name.toLowerCase().includes('radio'));
        const dbStoredPlaylists = await this.dbs.model.find();
        const webflowPlaylists = await this.webflowService.getCollectionItems(radioCollection._id);
        const webflowPlaylistIDs = webflowPlaylists.map(playlist => playlist['playlist-spotify-id']);

        for (const playlist of dbStoredPlaylists) {
            if (webflowPlaylistIDs.includes(playlist.sp_playlist_id)) {
                this.logger.info(`${this.pluginColour(playlist.sp_playlist_name)} already exists on Webflow CMS Collection ${this.pluginColour(radioCollection.name)}`);
                continue;
            }

            try {
                const webflowPlaylistItem = await this.webflowService.addItem(radioCollection._id, {
                    name: playlist.sp_playlist_name,
                    slug: `${playlist.sp_playlist_name.toLowerCase().replaceAll(URL_VALID_CHARACTERS, "-")}-${playlist.sp_playlist_local_id}`,
                    _archived: false,
                    _draft: false,
                    "playlist-description": playlist.sp_playlist_description,
                    "playlist-spotify-id": playlist.sp_playlist_id,
                    "playlist-spotify-uri": playlist.sp_playlist_uri,
                    "playlist-spotify-api-url": playlist.sp_playlist_api_url,
                    "playlist-spotify-collaborative": playlist.sp_playlist_collaborative,
                    "playlist-spotify-href": playlist.sp_playlist_href,
                    "playlist-spotify-owner": playlist.sp_playlist_owner.display_name,
                    "playlist-spotify-total-tracks": playlist.sp_playlist_total_tracks,
                    "playlist-spotify-snapshot-id": playlist.sp_playlist_snapshot_id
                });

                this.logger.info(`${webflowPlaylistItem.name} (${webflowPlaylistItem._id}) has been uploaded to Webflow Collection ${this.pluginColour(radioCollection.name)}`);

            } catch (error) {
                const caughtError = error as AxiosError;
                this.logger.error(`There was an error adding ${playlist.sp_playlist_name} to Webflow`, caughtError.response);
            }

        }

        this.logger.info('Upload to Webflow has been completed');
    }

    async runMuse() {
        const spotifyClient = await this.initializeSpotify();
        const isSuccessfullyAuthenticated = spotifyClient.getAccessToken() ? true : false;

        if (!isSuccessfullyAuthenticated) {
            this.tempServer.on('exit', async code => {
                if (code !== 0) {
                    this.logger.error('An error occurred while running the authentication server. Child process exited with code:', code);
                    this.logger.fatal('Process will exit in 10 seconds...');

                    setTimeout(() => {
                        this.logger.fatal('Process is now exiting...');
                        process.exit(0);
                    }, secondsToMs(10));
                }

                this.logger.debug(false, 'Are we successfully authenticated?', this.authenticationStatus);

                return await this.runMuse();
            });
        }

        if (this.authenticationStatus === true) {
            const playlistPrompt = await inquirer.prompt(
                {
                    name: 'addPlaylist',
                    type: 'confirm',
                    message: 'Would you like to add a playlist to the database?'
                }
            );

            const uploadPrompt = await inquirer.prompt({
                name: 'uploadPlaylistToWebsite',
                type: 'confirm',
                message: 'Would you like to upload a playlist to Webflow?'
            });


            if (playlistPrompt.addPlaylist === true && uploadPrompt.uploadPlaylistToWebsite === true) {
                await this.addPlaylistToDatabase();
                await this.uploadPlaylists();


            } else if (playlistPrompt.addPlaylist === false && uploadPrompt.uploadPlaylistToWebsite === true) {
                await this.uploadPlaylists();


            } else if (playlistPrompt.addPlaylist === true && uploadPrompt.uploadPlaylistToWebsite === false) {
                await this.addPlaylistToDatabase();
            }
        }
    }
}