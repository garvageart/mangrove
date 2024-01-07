import { io } from "socket.io-client";
import { L2W_SERVER_URL } from "../../../l2w.constants";
import { readable } from "svelte/store";

const socketConnection = io(L2W_SERVER_URL, {
	transports: ["websocket", 'polling', "webtransport"]
});

export const socketStore = readable(socketConnection); 