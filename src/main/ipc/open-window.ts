import { IpcMainEvent } from "electron";

import { IIPCHandler } from "../ipc";
import { IPCRequests, IPCResponses } from "../../shared/ipc";
import { IWindowDefinition, WindowController } from "../window";

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
		const window = await WindowController.WindowOnDemand(definition);
		event.sender.send(IPCResponses.OpenWindowOnDemand, window.id);
	}
}
