import { BrowserWindow, dialog, IpcMainEvent } from "electron";

import { IIPCHandler } from "../handlers/ipc";
import { WindowsHandler } from "../handlers/window";
import { IPCRequests, IPCResponses } from "../../shared/ipc";

export class OpenDirectoryDialogIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.OpenDirectoryDialog;

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
	 * @param title defines the title of the directory open dialog.
     * @param defaultPath defines the path opened once the dialog opens.
	 */
	public async handler(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
        const window = WindowsHandler.GetWindowByWebContentsId(event.sender.id) ?? this._window;
		const result = await dialog.showOpenDialog(window, { title, defaultPath, properties: ["openDirectory", "createDirectory"] });

		if (!result || !result.filePaths.length) { return event.sender.send(IPCResponses.CancelOpenFileDialog); }
		event.sender.send(IPCResponses.OpenDirectoryDialog, result.filePaths[0]);
	}
}

export class OpenFileDialogIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.OpenFileDialog;

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
	 * @param title defines the title of the directory open dialog.
     * @param defaultPath defines the path opened once the dialog opens.
	 */
	public async handler(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
        const window = WindowsHandler.GetWindowByWebContentsId(event.sender.id) ?? this._window;
		const result = await dialog.showOpenDialog(window, { title, defaultPath, properties: ["openFile"] });

		if (!result || !result.filePaths.length) { return event.sender.send(IPCResponses.CancelOpenFileDialog); }
		event.sender.send(IPCResponses.OpenFileDialog, result.filePaths[0]);
	}
}

export class SaveFileDialogIPC implements IIPCHandler {
	/**
	 * Defines the name of the channel to listen.
	 */
	public channel: string = IPCRequests.SaveFileDialog;

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
	 * @param title defines the title of the directory save dialog.
     * @param defaultPath defines the path opened once the dialog opens.
	 */
	public async handler(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
        const window = WindowsHandler.GetWindowByWebContentsId(event.sender.id) ?? this._window;
		const result = await dialog.showSaveDialog(window, { title, defaultPath, properties: [] });

		if (!result || !result.filePath) { return event.sender.send(IPCResponses.CancelSaveFileDialog); }
		event.sender.send(IPCResponses.SaveFileDialog, result.filePath);
	}
}
