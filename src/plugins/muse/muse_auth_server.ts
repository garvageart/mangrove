import type Cryptographer from "../../addons/cryptographer.addon";
import { fastifyClient } from "../../config/clients.config";
import { MUSE_DB_CONNECTION_DEFAULTS } from "../../config/db.config";
import { IS_ENV, IS_PROCESS_CHILD } from "../../globals";
import type { DatabaseService } from "../../services/db.service";
import type { MuseSecurityKeys } from "../../types/addons/cryptographer.addon";
import type { AuthorizationCodeFlowResponse, IMuseSpotifyAuth } from "../../types/plugins/muse.types";
import { generateRandomID, secondsToMs, sleep } from "../../util";
import { AUTH_SERVER_PORT } from "./muse.constants";
import MusePlugin from "./muse_client";
import { SPOTIFY_AUTH_SCOPES } from "./muse_config";

export default class MuseAuthServer extends MusePlugin {
    startAuthenticationServer() {
        fastifyClient.get("/authorize", (req, res) => {
            res.redirect(302, this.client?.createAuthorizeURL(SPOTIFY_AUTH_SCOPES, generateRandomID({ numLength: 5, idLength: 16 })));
        });

        fastifyClient.get("/callback", async (req, res) => {
            const query = req.query as AuthorizationCodeFlowResponse;

            const code = query?.code;
            const error = query?.error;
            const state = query?.state;

            if (error) {
                res.log.error('Callback error:', error);
                res.send(`Callback error: ${error}`);
                return;
            }

            if (!code) {
                res.status(401).send('No authorization code found');
                res.log.error('No authorization code found');

                await fastifyClient.close().then(() => {
                    this.logger.info('Process will exit in 10 seconds...');

                    setTimeout(() => {
                        this.logger.info('Process is now exiting...');
                        process.exit(1);
                    }, secondsToMs(10));
                });
            }

            try {
                const authData = await this.client.authorizationCodeGrant(code);

                const accessToken = authData.body.access_token;
                const refreshToken = authData.body.refresh_token;

                this.client.setAccessToken(accessToken);
                this.client.setRefreshToken(refreshToken);

                const dbAuth = this.addOns[0] as DatabaseService<IMuseSpotifyAuth>;
                const spotifyCryptographer = this.addOns[1] as Cryptographer<MuseSecurityKeys>;

                const authDataConnection = await dbAuth.createNewConnection(MUSE_DB_CONNECTION_DEFAULTS);

                authDataConnection.on("open", async () => {
                    this.logger.info(`Opened temporary connection to MongoDB for Spotify Authorization`);
                });

                const secretKey = await spotifyCryptographer.createSecretKey();
                const initialVector = await spotifyCryptographer.createInitialVector();

                await spotifyCryptographer.storeKey("SP_SECRET_KEY", secretKey.toString('hex'))
                    .catch(error => this.logger.info('An error occured while trying to store key:', error));

                await spotifyCryptographer.storeKey("SP_INITIAL_VECTOR", initialVector.toString('hex'))
                    .catch(error => this.logger.info('An error occured while trying to store key:', error));

                await sleep(3000);

                const encryptedRefreshTokenData = spotifyCryptographer.encrypt(refreshToken);
                const encryptedAccessTokenData = spotifyCryptographer.encrypt(accessToken);

                const encryptedRefreshToken = encryptedRefreshTokenData.encryptedData;
                const encryptedAccessToken = encryptedAccessTokenData.encryptedData;

                await spotifyCryptographer.storeKey('SP_AUTH_RT_TAG', encryptedRefreshTokenData.authTag.toString('hex'))
                    .catch(error => this.logger.info('An error occured while trying to store key:', error));

                await spotifyCryptographer.storeKey('SP_AUTH_AT_TAG', encryptedAccessTokenData.authTag.toString('hex'))
                    .catch(error => this.logger.info('An error occured while trying to store key:', error));

                const authorizedDate = Date.now();
                const accessTokenExpiresDate = new Date(authorizedDate + authData.body.expires_in * 1000);

                try {
                    const savedAuthData = await dbAuth.addDocument({
                        sp_auth_access_token: encryptedAccessToken,
                        sp_auth_refresh_token: encryptedRefreshToken,
                        sp_auth_expires_date: accessTokenExpiresDate,
                        sp_auth_state: state,
                        sp_auth_authorized_at: new Date(authorizedDate),
                        sp_auth_refresh_token_changed: true,
                        sp_auth_scope: authData.body.scope,
                        sp_auth_token_type: authData.body.token_type
                    });

                    res.send(`Authorization successful! Access token expires at ${savedAuthData.sp_auth_expires_date}. You can now close your browser`);
                    fastifyClient.log.info(`Authorization successful! Access token expires at ${this.pluginColour.italic(savedAuthData.sp_auth_expires_date)}. You can now close your browser`);

                    process.send(authData);

                    await authDataConnection.close()
                        .then(() => this.logger.info(`Temporary MongoDB connection for Spotify Authorization has been closed`))
                        .catch((error) => this.logger.info('There was an error closing the MongoDB connection:', error));

                    await fastifyClient.close().then(() => {
                        this.logger.info('Authentication server has been closed');

                        if (IS_ENV.development && !IS_PROCESS_CHILD) {
                            this.logger.info('Authorization server is closed');

                            this.logger.info('Press any key to exit...');

                            process.stdin.setRawMode(true);
                            process.stdin.resume();
                            process.stdin.on('data', process.exit.bind(process, 0));
                        }
                    }).catch((error) => this.logger.error('Error closing authorization server:', error));

                } catch (error) {
                    this.logger.error('An error occurred saving your authorization data to the database:', error);
                }
            } catch (error) {
                const caughtError = error as Error;

                this.logger.error('Error getting tokens:', '\n' + caughtError.stack);
                res.status(401).send(`Error getting tokens: ${caughtError}`);
            }
        });

        fastifyClient.listen({ port: this.options.serverPort }, (error) => {
            if (error) {
                this.logger.info('An error occured running the server:', error);
            }

            this.logger.info(`Autorization server is running. Open http://localhost:${this.options.serverPort}/authorize in the browser`);
        });
    }
}

if (IS_PROCESS_CHILD) {
    const authServer = new MuseAuthServer({
        serverPort: AUTH_SERVER_PORT
    });

    process.on('uncaughtException', (err) => {
        authServer.logger.error('Uncaught exception on the child process:', err);
        process.send(err);
    });

    authServer.startAuthenticationServer();
}