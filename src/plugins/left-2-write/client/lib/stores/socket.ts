import { io } from "socket.io-client";
import { L2W_SERVER_HREF } from "../../../l2w.constants";
import { readable } from "svelte/store";

const socketConnection = io(!location.port ? L2W_SERVER_HREF : `${location.hostname}:3333`, {
	transports: ["websocket", 'polling', "webtransport"]
});

export const socketStore = readable(socketConnection); 