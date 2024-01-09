import MusePlugin from "./muse_client";
import { secondsToMs } from "../../util";
import { IS_ENV, MONGODB_DEFAULT_DATABASE } from "../../globals";
import { AUTH_SERVER_PORT } from "./muse.constants";

const spotify = new MusePlugin({
    serverPort: AUTH_SERVER_PORT
});

const spotifyDB = await spotify.initializeMongoDBConnection({
    dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "MuseTestDB",
    uri: process.env.MONGODB_DOMAIN,
    retryLimit: 3,
    retryTimeout: secondsToMs(5),
    localFallback: true
});

if (spotifyDB.readyState === 1) {
    const spotifyClient = await spotify.initializeSpotify();
    const isSuccessfullyAuthenticated = spotifyClient.getAccessToken() ? true : false;

    if (!isSuccessfullyAuthenticated) {
        spotify.tempServer.on('exit', async code => {
            if (code !== 0) {
                spotify.logger.warn('An error occurred while running the authentication server. Child process exited with code:', code);
                spotify.logger.fatal('Process will exit in 10 seconds...');

                setTimeout(() => {
                    spotify.logger.fatal('Process is now exiting...');
                    process.exit(0);
                }, secondsToMs(10));
            }

            spotify.logger.debug(false, 'Are we successfully authenticated?', spotify.authenticationStatus);
            spotify.logger.info('Adding playlists to local database');
            await spotify.addPlaylistToDatabase();
        });
    }

    if (spotify.authenticationStatus) {
        spotify.logger.info('Adding playlists to local database');
        await spotify.addPlaylistToDatabase();
    }
}