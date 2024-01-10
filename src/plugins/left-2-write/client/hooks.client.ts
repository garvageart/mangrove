import type { HandleFetch } from '@sveltejs/kit';
import { L2W_SERVER_PORT } from "../l2w.constants";

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
    if (request.url.includes('.lesis.online')) {
        const reqURL = new URL(request.url);
        const newURLbase = `http://127.0.0.1:${L2W_SERVER_PORT}${reqURL.pathname}`;
        const newURL = !globalThis.window?.location.port ? newURLbase.replace('http', 'https') : newURLbase;

        request = new Request(
            newURL,
            request,
        );
    }

    return fetch(request);
};