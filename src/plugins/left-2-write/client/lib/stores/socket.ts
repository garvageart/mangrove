import { io } from "socket.io-client";
import { L2W_EDITING_SERVER_HREF } from "../../../l2w.constants";
import { readable } from "svelte/store";

const socketConnection = io(L2W_EDITING_SERVER_HREF, {
	transports: ["polling"]
});

export const socketStore = readable(socketConnection) 