import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { DevTools } from "../tools/devtools";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class EnableDevToolsIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.EnableDevTools;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param enabled defines wether or not devtools are enabled.
	 */
	public async handler(event: IpcMainEvent, enabled: boolean): Promise<void> {
		await DevTools.Apply(enabled, event.sender);
		event.sender.send(IPCResponses.EnableDevTools);
	}
}
