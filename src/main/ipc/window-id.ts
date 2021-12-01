import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class GetWindowIdIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.GetWindowId;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 */
	public handler(event: IpcMainEvent): void {
		event.sender.send(IPCResponses.GetWindowId, event.sender.id);
	}
}
