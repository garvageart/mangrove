import type { HandleFetch } from '@sveltejs/kit';
import { L2W_SERVER_PORT } from "../l2w.constants";

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
    if (request.url.includes('.lesis.online')) {
        const reqURL = new URL(request.url);
        request = new Request(
            `http://127.0.0.1:${L2W_SERVER_PORT}${reqURL.pathname}`,
            request,
        );
    }

    return fetch(request);
};