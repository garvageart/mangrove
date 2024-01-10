import { io } from "socket.io-client";
import { L2W_SERVER_HREF, L2W_SERVER_PORT } from "../../../l2w.constants";
import { readable } from "svelte/store";
import { browser } from "$app/environment";

const url = (browser && !location?.port) ? L2W_SERVER_HREF : `http://127.0.0.1:${L2W_SERVER_PORT}`;

const socketConnection = io(url, {
	transports: ["websocket", 'polling', "webtransport"]
});

export const socketStore = readable(socketConnection); 