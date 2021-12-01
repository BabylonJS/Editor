import { BrowserWindow, IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { WindowsHandler } from "../handlers/window";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class SendWindowMessageIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.SendWindowMessage;

	/**
	 * Constructor.
	 * @param _window defines the reference to the main window.
	 */
    public constructor(private _window: BrowserWindow) {
        // Empty at the moment.
    }

	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
     * @param windowId defines the id of the window to send the given data.
     * @param data defines the data sent to the given window id.
	 */
	public handler(_: IpcMainEvent, windowId: number, data: any): void {
		const window = WindowsHandler.GetWindowByWebContentsId(windowId);
		if (!window) {
			return this._window.webContents.send(IPCResponses.SendWindowMessage, data);
		}

		window.webContents.send(IPCResponses.SendWindowMessage, data);
	}
}
