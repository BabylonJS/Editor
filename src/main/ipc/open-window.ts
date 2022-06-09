import { join } from "path";
import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { IPCRequests, IPCResponses } from "../../shared/ipc";
import { IWindowDefinition, WindowsHandler } from "../handlers/window";

export class OpenWindowIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.OpenWindowOnDemand;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param windowId defines the id of the window to focus.
	 */
	public async handler(event: IpcMainEvent, definition: IWindowDefinition): Promise<void> {
		definition.url = `file://${__dirname}/../../../../html/${definition.url}`;
		
		definition.options.webPreferences ??= { };
		definition.options.webPreferences.preload = join(__dirname + "/../../../../build/src/preloaders/plugin.js");

		const window = await WindowsHandler.CreateWindowOnDemand(definition);

		if (process.env.DEBUG) {
			window.webContents.openDevTools({ mode: "right" });
		}

		event.sender.send(IPCResponses.OpenWindowOnDemand, window.webContents.id);
	}
}
