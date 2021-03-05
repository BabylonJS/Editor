import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../ipc";
import { WindowController } from "../window";
import { IPCRequests } from "../../shared/ipc";

export class OpenDevToolsIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.OpenDevTools;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param args defines the args sent from the renderer process.
	 */
	public handler(event: IpcMainEvent): void {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id);
		if (window) {
			window.webContents?.openDevTools({ mode: "detach" });
		}
	}
}
