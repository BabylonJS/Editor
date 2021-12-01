import { BrowserWindow, IpcMainEvent, TouchBar, TouchBarSegmentedControl, SegmentedControlSegment } from "electron";

import { join } from "path";

import { PathTools } from "../tools/path";
import { DevTools } from "../tools/devtools";

import { IPCRequests } from "../../shared/ipc";

import { IIPCHandler } from "../handlers/ipc";
import { WindowsHandler } from "../handlers/window";

interface _ISegmentedGroup {
	element: any;
	touchbar: SegmentedControlSegment;
}

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

		const items: TouchBarSegmentedControl[] = [];

		if (process.env.DEBUG || DevTools.IsEnabled) {
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

		const group: _ISegmentedGroup[] = [];
		elements.forEach((e) => {
			if (e.separator) {
				items.push(this._createTouchBarSegmentedControl(window, group.slice()));
				group.splice(0, group.length);
				return;
			}

			group.push({ element: e, touchbar: this._getTouchBarElements(window, e) });
		});

		if (group.length) {
			items.push(this._createTouchBarSegmentedControl(window, group.slice()));
		}

		window.setTouchBar(new TouchBar({ items }));
	}

	/**
	 * Creates a new touchbar segmented control taking the given group as segments.
	 */
	private _createTouchBarSegmentedControl(window: BrowserWindow, group: _ISegmentedGroup[]): TouchBarSegmentedControl {
		return new TouchBar.TouchBarSegmentedControl({
			mode: "buttons",
			segments: group.map((g) => g.touchbar),
			change: (index) => window.webContents?.send(group[index]?.element.eventName),
		});
	}

	/**
	 * Returns the touchbar element according to the given element configuration (button, spacer, etc.).
	 */
	private _getTouchBarElements(window: BrowserWindow, element: any): SegmentedControlSegment {
		if (element.icon && !element.iconPosition) {
			element.iconPosition = "left";
		}

		return new TouchBar.TouchBarButton({
			label: element.label,
			iconPosition: element.iconPosition,
			click: () => window.webContents?.send(element.eventName),
			icon: element.icon ? join(PathTools.GetAppPath(), element.icon) : undefined,
		});
	}
}
