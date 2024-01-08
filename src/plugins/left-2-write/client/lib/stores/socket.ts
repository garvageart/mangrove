import { io } from "socket.io-client";
import { L2W_SERVER_HREF } from "../../../l2w.constants";
import { readable } from "svelte/store";
import { browser } from "$app/environment";

const socketConnection = io((!browser && !globalThis.window?.location !== undefined && !globalThis.window?.location?.port) ? L2W_SERVER_HREF.replace('http', '') : `${location?.hostname}:3333`, {
	transports: ["websocket", 'polling', "webtransport"]
});

export const socketStore = readable(socketConnection); 