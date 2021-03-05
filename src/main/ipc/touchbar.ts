import { IpcMainEvent, TouchBar } from "electron";

import { IIPCHandler } from "../ipc";
import { WindowController } from "../window";
import { IPCRequests } from "../../shared/ipc";

export class ToucharIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.SetTouchBar;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param args defines the args sent from the renderer process.
	 */
	public handler(event: IpcMainEvent, elements: any[]): void {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id);
		if (!window) { return; }

		window.setTouchBar(new TouchBar({
			items: elements.map((e) => new TouchBar.TouchBarButton({
				label: e.label,
				iconPosition: e.iconPosition,
				click: () => window.webContents?.send(e.eventName),
			})),
		}));
	}
}
