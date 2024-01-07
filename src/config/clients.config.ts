import 'dotenv/config';
import fs from 'fs';
import Webflow from 'webflow-api';
import { TwitterApi } from 'twitter-api-v2';
import SpotifyWebApi from 'spotify-web-api-node';
import fastify from 'fastify';
import {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI
} from '../plugins/muse/muse_config';
import { FastifyLogger } from '../logger';
import { IS_ENV } from "../globals";

export const spotifyClient = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    redirectUri: SPOTIFY_REDIRECT_URI
});

const fastifyClientOptions = {
    logger: new FastifyLogger,
    bodyLimit: 30 * 1024 * 1024,
    https: {}
};

if (IS_ENV.production) {
    fastifyClientOptions.https = {
        key: fs.readFileSync(process.env.WEBSITE_HTTPS_KEY),
        cert: fs.readFileSync(process.env.WEBSITE_HTTPS_CERT)
    };
}

export const fastifyClient = fastify(fastifyClientOptions);

export const fastifyImageClient = fastify({
    logger: new FastifyLogger,
    https: {
        key: fs.readFileSync(process.env.WEBSITE_HTTPS_KEY),
        cert: fs.readFileSync(process.env.WEBSITE_HTTPS_CERT)
    }
});

export const webflowClient = new Webflow({ token: process.env.WEBFLOW_TOKEN });

export const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
}).readWrite;