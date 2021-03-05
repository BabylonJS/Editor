import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { WindowsHandler } from "../handlers/window";
import { IPCRequests } from "../../shared/ipc";

export class FocusWindowIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.FocusWindow;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param windowId defines the id of the window to focus.
	 */
	public handler(_: IpcMainEvent, windowId: number): void {
		const window = WindowsHandler.GetWindowById(windowId);
		if (window) {
			if (window.isMinimized()) { window.restore(); }
			window.focus();
		}
	}
}
