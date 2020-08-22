import { ipcMain, dialog, IpcMainEvent, BrowserWindow } from "electron";

import EditorApp from "./main";
import { Settings } from "./settings";
import { DevTools } from "./devtools";
import { WindowController, IWindowDefinition } from "./window";

import { GameServer } from "./game/server";
import { IPCRequests, IPCResponses } from "../shared/ipc";

export class IPC {
	public static Window: BrowserWindow;

	/**
	 * Constructor.
	 */
	public constructor(window: BrowserWindow) {
		IPC.Window = window;

		ipcMain.on(IPCRequests.OpenWindowOnDemand, IPC.OnOpenWindowOnDemand);

		ipcMain.on(IPCRequests.OpenDirectoryDialog, IPC.OnOpenDirectoryDialog);
		ipcMain.on(IPCRequests.OpenFileDialog, IPC.OnOpenFileDialog);
		ipcMain.on(IPCRequests.SaveFileDialog, IPC.OnSaveFileDialog);

		ipcMain.on(IPCRequests.GetProjectPath, IPC.OnGetProjectPath);
		ipcMain.on(IPCRequests.SetProjectPath, IPC.OnSetProjectPath);

		ipcMain.on(IPCRequests.GetWorkspacePath, IPC.OnGetWorkspacePath);
		ipcMain.on(IPCRequests.SetWorkspacePath, IPC.OnSetWorkspacePath);

		ipcMain.on(IPCRequests.StartGameServer, IPC.StartWebServer);

		ipcMain.on(IPCRequests.SendWindowMessage, IPC.SendWindowMessage);
		ipcMain.on(IPCRequests.FocusWindow, IPC.FocusWindow);
		ipcMain.on(IPCRequests.CloseWindow, IPC.CloseWindow);

		ipcMain.on(IPCRequests.EnableDevTools, IPC.OnEnableDevTools);
		ipcMain.on(IPCRequests.OpenDevTools, IPC.OnOpenDevTools);
	}

	/**
	 * Starts debugging the game.
	 */
	public static async OnOpenWindowOnDemand(event: IpcMainEvent, definition: IWindowDefinition): Promise<void> {
		definition.url = `file://${__dirname}/../../../../html/${definition.url}`;
		const window = await WindowController.WindowOnDemand(definition);
		event.sender.send(IPCResponses.OpenWindowOnDemand, window.id);
	}

	/**
	 * The user wants to show the open file dialog.
	 */
	public static async OnOpenDirectoryDialog(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id) ?? EditorApp.Window;
		const result = await dialog.showOpenDialog(window, { title, defaultPath, properties: ["openDirectory"] });

		if (!result || !result.filePaths.length) { return event.sender.send(IPCResponses.CancelOpenFileDialog); }
		event.sender.send(IPCResponses.OpenDirectoryDialog, result.filePaths[0]);
	}

	/**
	 * The user wants to show the open file dialog.
	 */
	public static async OnOpenFileDialog(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id) ?? EditorApp.Window;
		const result = await dialog.showOpenDialog(window, { title, defaultPath, properties: ["openFile"] });

		if (!result || !result.filePaths.length) { return event.sender.send(IPCResponses.CancelOpenFileDialog); }
		event.sender.send(IPCResponses.OpenFileDialog, result.filePaths[0]);
	}

	/**
	 * The user wants to show a save file dialog.
	 */
	public static async OnSaveFileDialog(event: IpcMainEvent, title: string, defaultPath: string): Promise<void> {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id) ?? EditorApp.Window;
		const result = await dialog.showSaveDialog(window, { title, defaultPath, properties: [] });

		if (!result || !result.filePath) { return event.sender.send(IPCResponses.CancelSaveFileDialog); }
		event.sender.send(IPCResponses.SaveFileDialog, result.filePath);
	}

	/**
	 * The user wants to know what is the opened project file from the OS file explorer.
	 */
	public static OnGetProjectPath(event: IpcMainEvent): void {
		event.sender.send(IPCResponses.GetProjectPath, Settings.OpenedFile);
	}

	/**
	 * The user wants to set the new project path.
	 */
	public static OnSetProjectPath(event: IpcMainEvent, path: string): void {
		Settings.OpenedFile = path;
		event.sender.send(IPCResponses.SetProjectPath);
	}

	/**
	 * The user wants to know what is the opened project file from the OS file explorer.
	 */
	public static OnGetWorkspacePath(event: IpcMainEvent): void {
		event.sender.send(IPCResponses.GetWorkspacePath, Settings.WorkspacePath);
	}

	/**
	 * The user wants to set the new project path.
	 */
	public static OnSetWorkspacePath(event: IpcMainEvent, path: string): void {
		Settings.WorkspacePath = path;
		event.sender.send(IPCResponses.SetWorkspacePath);
	}

	/**
	 * The user wants to set the new project path.
	 */
	public static StartWebServer(event: IpcMainEvent, path: string, port: number): void {
		GameServer.RunServer(path, port);
		event.sender.send(IPCResponses.StartGameServer);
	}

	/**
	 * The user opened a new window and the window is requiring things.
	 */
	public static SendWindowMessage(_: IpcMainEvent, windowId: number, data: any): void {
		const window = WindowController.GetWindowById(windowId);
		if (!window) {
			return IPC.Window.webContents.send(IPCResponses.SendWindowMessage, data);
		}

		window.webContents.send(IPCResponses.SendWindowMessage, data);
	}

	/**
	 * Focuses the window identified by the given id.
	 */
	public static FocusWindow(_: IpcMainEvent, windowId: number): void {
		const window = WindowController.GetWindowById(windowId);
		if (window) {
			if (window.isMinimized()) { window.restore(); }
			window.focus();
		}
	}

	/**
	 * Closes the window identified by the given id.
	 */
	public static CloseWindow(_: IpcMainEvent, windowId: number): void{
		WindowController.CloseWindow(windowId);
	}

	/**
	 * Enables the devtools. Typically used when developing a plugin for the Editor.
	 */
	public static async OnEnableDevTools(event: IpcMainEvent, enabled: boolean): Promise<void> {
		await DevTools.Apply(enabled, event.sender);
		event.sender.send(IPCResponses.EnableDevTools);
	}

	/**
	 * Enables the devtools. Typically used when developing a plugin for the Editor.
	 */
	public static async OnOpenDevTools(event: IpcMainEvent): Promise<void> {
		const window = WindowController.GetWindowByWebContentsId(event.sender.id);
		if (window) {
			window.webContents?.openDevTools({ mode: "detach" });
		}
	}
}
