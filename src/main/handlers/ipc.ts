import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";

import { OpenWindowIPC } from "../ipc/open-window";

import { SetProjectPathIPC, GetProjectPathIPC } from "../ipc/project";
import { GetWorkspacePathIPC, SetWorkspacePathIPC } from "../ipc/workspace";

import { GetAppPathIPC } from "../ipc/app-path";
import { GetWindowIdIPC } from "../ipc/window-id";

import { OpenDirectoryDialogIPC, OpenFileDialogIPC, SaveFileDialogIPC } from "../ipc/dialogs";

import { StartWebServerIPC } from "../ipc/webserver";
import { SendWindowMessageIPC } from "../ipc/window-message";

import { CloseWindowIPC } from "../ipc/close-window";
import { FocusWindowIPC } from "../ipc/focus-window";

import { EnableDevToolsIPC } from "../ipc/enable-devtools";
import { OpenDevToolsIPC } from "../ipc/open-devtools";

import { ToucharIPC } from "../ipc/touchbar";

export interface IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	channel: string;
	/**
	 * Defines the handler called on the channel receives a message from the renderer process.
	 * @param event defines the reference to the IPC event.
	 * @param args defines the args sent from the renderer process.
	 */
	handler(event: IpcMainEvent, ...args: any[]): void | Promise<void>;
}

export class IPCHandler {
	private _handlers: IIPCHandler[] = [];

	/**
	 * Constructor.
	 * @param window defines the reference to the main window.
	 */
	public constructor(window: BrowserWindow) {
		this.registerHandler(new OpenWindowIPC());

		this.registerHandler(new OpenDirectoryDialogIPC(window));
		this.registerHandler(new OpenFileDialogIPC(window));
		this.registerHandler(new SaveFileDialogIPC(window));

		this.registerHandler(new GetProjectPathIPC());
		this.registerHandler(new SetProjectPathIPC());

		this.registerHandler(new GetWorkspacePathIPC());
		this.registerHandler(new SetWorkspacePathIPC());

		this.registerHandler(new GetAppPathIPC());
		this.registerHandler(new GetWindowIdIPC());

		this.registerHandler(new StartWebServerIPC());

		this.registerHandler(new SendWindowMessageIPC(window));

		this.registerHandler(new FocusWindowIPC());
		this.registerHandler(new CloseWindowIPC());

		this.registerHandler(new EnableDevToolsIPC());
		this.registerHandler(new OpenDevToolsIPC());
		
		this.registerHandler(new ToucharIPC());
	}

	/**
	 * Registers the given handler to the IPC messages handlers.
	 * @param handler defines the reference to the handler to register.
	 */
	public registerHandler(handler: IIPCHandler): void {
		const exists = this._handlers.find((h) => h.channel === handler.channel);
		if (exists) {
			throw new Error(`A handler with channel "${handler.channel} already exists."`);
		}

		this._handlers.push(handler);
		ipcMain.on(handler.channel, handler.handler.bind(handler));
	}
}
