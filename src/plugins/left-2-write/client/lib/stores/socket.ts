import { io } from "socket.io-client";
import { L2W_SERVER_HREF, L2W_SERVER_PORT, L2W_SERVER_URL } from "../../../l2w.constants";
import { readable } from "svelte/store";
import { browser } from "$app/environment";

const socketConnection = io((browser && !location?.port) ? `${L2W_SERVER_URL.replace('http', 'https')}:${L2W_SERVER_PORT}` : L2W_SERVER_HREF, {
	transports: ["websocket", 'polling', "webtransport"]
});

export const socketStore = readable(socketConnection); 