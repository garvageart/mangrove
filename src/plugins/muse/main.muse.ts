import MusePlugin from "./muse_client";
// import { MUSE_DB_CONNECTION_DEFAULTS } from "../../config/db.config";
import { secondsToMs } from "../../util";
import { IS_ENV, MONGODB_DEFAULT_DATABASE } from "../../globals";
import { AUTH_SERVER_PORT } from "./muse.constants";

const spotify = new MusePlugin({
    serverPort: AUTH_SERVER_PORT
});

// process.on('uncaughtException', (error) => {
//     spotify.logger.debug(true, 'An uncaught exception occurred:', error.message, '\n' + error.stack);
// });

async function fetchData() {
    try {
        await spotify.addPlaylistToDatabase();
        // const playlistData = await spotify.getPlaylists(10);

        // spotify.logger.info('Spotify Playlist Data:', playlistData.map(playlist => {
        //     return {
        //         playlist_name: playlist.name,
        //         playlist_owner: playlist.owner,
        //         playlist_description: playlist.description,
        //         playlist_id: playlist.id,
        //         playlist_link: playlist.external_urls.spotify
        //     };
        // }));
    } catch (error) {
        const caughtError = error as Error;
        spotify.logger.error('An error occurred while getting Spotify data', '\n' + caughtError.stack);
    }

    // await spotify.closeMongoDBConnection().then(() => {
    //     if (!IS_ENV.production) {
    //         spotify.logger.warn('Process will exit in 10 seconds...');

    //         setTimeout(() => {
    //             spotify.logger.warn('Process is now exiting');
    //             process.exit(0);
    //         }, secondsToMs(10));
    //     }

    // });
}

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
                spotify.logger.error('An error occurred while running the authentication server. Child process exited with code:', code);
                spotify.logger.fatal('Process will exit in 10 seconds...');

                setTimeout(() => {
                    spotify.logger.fatal('Process is now exiting...');
                    process.exit(0);
                }, secondsToMs(10));
            }

            spotify.logger.debug(false, 'Are we successfully authenticated?', spotify.authenticationStatus);
            spotify.logger.info('Adding playlists to local database');
            await spotify.addPlaylistToDatabase();
            // await fetchData();
        });
    }

    if (spotify.authenticationStatus) {
        spotify.logger.info('Adding playlists to local database');
        await spotify.addPlaylistToDatabase();
        // await fetchData();
    }


}