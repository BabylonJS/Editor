import { IpcMainEvent, TouchBar } from "electron";

import { join } from "path";

import { PathTools } from "../tools/path";
import { IPCRequests } from "../../shared/ipc";

import { IIPCHandler } from "../handlers/ipc";
import { WindowsHandler } from "../handlers/window";

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
		const window = WindowsHandler.GetWindowByWebContentsId(event.sender.id);
		if (!window) { return; }

		const items = elements.map((e) => {
			if (e.icon && !e.iconPosition) {
				e.iconPosition = "left";
			}

			if (e.separator) {
				return new TouchBar.TouchBarSpacer({ });
			}

			return new TouchBar.TouchBarButton({
				label: e.label,
				iconPosition: e.iconPosition,
				icon: e.icon ? join(PathTools.GetAppPath(), e.icon) : undefined,
				click: () => window.webContents?.send(e.eventName),
			});
		});

		if (process.env.DEBUG) {
			// Add shortcuts for debug
			items.push.apply(items, [
				new TouchBar.TouchBarButton({
					label: "F8",
					click: () => window.webContents?.devToolsWebContents?.sendInputEvent({ type: "keyDown", keyCode: "F8", modifiers: [] }),
				}),
				new TouchBar.TouchBarButton({
					label: "F10",
					click: () => window.webContents?.devToolsWebContents?.sendInputEvent({ type: "keyDown", keyCode: "F10", modifiers: [] }),
				}),
				new TouchBar.TouchBarButton({
					label: "F11",
					click: () => window.webContents?.devToolsWebContents?.sendInputEvent({ type: "keyDown", keyCode: "F11", modifiers: [] }),
				}),
			]);
		}

		window.setTouchBar(new TouchBar({
			items,
		}));
	}
}
