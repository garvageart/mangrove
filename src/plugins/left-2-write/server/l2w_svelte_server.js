/* eslint-disable no-undef */
import { plugin } from "../../../../build/web/plugin.js";
import fastify from "fastify";
import "dotenv/config";

const fastifyClient = fastify({
    bodyLimit: 30 * 1024 * 1024
});

// add a route that lives separately from the SvelteKit app
fastifyClient.get('/healthcheck', (req, res) => {
    res.send('ok');
});

// let SvelteKit handle everything else, including serving prerendered pages and static assets

fastifyClient.register(plugin);

fastifyClient.listen({ port: parseInt(process.env.LEAF_SVELTEKIT_PORT) }, () => {
    console.log(`SvelteKit is listening on ${process.env.LEAF_SVELTEKIT_PORT}`);
});