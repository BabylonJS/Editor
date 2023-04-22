import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Rectangle } from "electron";
import { extname, join } from "path";
import { existsSync } from "fs";
import Store from "electron-store";
import * as os from "os";

import { Undefinable } from "../shared/types";

import { IPCHandler } from "./handlers/ipc";
import { Settings } from "./settings";
import { WindowsHandler } from "./handlers/window";

interface Config {
	windowBounds: Rectangle;
	isWindowMaximized: boolean;
	openedFile: string | null;
	workspacePath: string | null;
}

const ConfigSchema: Store.Schema<Config> = {
	windowBounds: {
		type: "object",
		properties: {
			x: { type: "number" },
			y: { type: "number" },
			width: { type: "number", default: 800 },
			height: { type: "number", default: 600 },
		}
	},
	isWindowMaximized: { type: "boolean", default: true },
	openedFile: { type: ["string", "null"], default: null },
	workspacePath: { type: ["string", "null"], default: null }
}

export default class EditorApp {
	/**
	 * Defines the reference to the main editor's window (electron)
	 */
	public static Window: BrowserWindow;
	/**
	 * Defines the reference to the IPC handler.
	 */
	public static IPCHandler: IPCHandler;

	private static _ForceQuit: boolean = false;

	/**
	 * Creates a new Electron window
	 */
	public static async Create(): Promise<void> {
		// Create window
		await this.CreateWindow();

		// Instantiate IPC handler
		this.IPCHandler = new IPCHandler(this.Window);

		// Create short cuts and touch bar
		this.CreateShortcutsAndMenu();
	}

	/**
	 * Configures the app's settings according to the opened file.
	 * @param filePathArgument the file opened
	 */
	public static ConfigureSettings(filePathArgument: Undefinable<string>): void {
		if (!filePathArgument) { return; }

		const extension = extname(filePathArgument).toLowerCase();
		switch (extension) {
			case ".editorproject":
				Settings.OpenedFile = filePathArgument;
				Settings.WorkspacePath = null;
				break;
			case ".editorworkspace":
				Settings.OpenedFile = null;
				Settings.WorkspacePath = filePathArgument;
				break;
			default: break;
		}
	}

	/**
	 * Returns the file path argument according to the current platform.
	 * @param argv defines the list of all arguments sent to the program when opening.
	 */
	public static GetFilePathArgument(argv: Undefinable<string[]>): Undefinable<string> {
		if (!argv) {
			return undefined;
		}

		const platform = os.platform();
		let index = (platform === "darwin") ? 2 : 1;
		while (index < argv.length && argv[index].startsWith('--')) {
			index += 1;
		}

		return index < argv.length ? argv[index] : undefined;
	}

	/**
	 * Creates a new window
	 */
	public static async CreateWindow(): Promise<void> {
		const store = new Store<Config>({ schema: ConfigSchema });
		console.log(`Configuration settings read from ${store.path}`, store.store);

		const verifyExists = (path: string | null) => {
			return path && existsSync(path) ? path : null;
		};
		Settings.OpenedFile = verifyExists(store.get("openedFile"));
		Settings.WorkspacePath = verifyExists(store.get("workspacePath"));

		// Save the opened file from the OS file explorer
		this.ConfigureSettings(this.GetFilePathArgument(process.argv));

		const windowBounds = store.get("windowBounds");
		const isWindowMaximized = store.get("isWindowMaximized");

		this.Window = await WindowsHandler.CreateWindowOnDemand({
			options: {
				...windowBounds,
				title: "Babylon.JS Editor Preview",
				webPreferences: {
					scrollBounce: true,
					nodeIntegration: true,
					contextIsolation: false,
					nodeIntegrationInWorker: true,
					nativeWindowOpen: false,
					nodeIntegrationInSubFrames: true,
					allowRunningInsecureContent: false,
					preload: join(__dirname + "/../../../build/src/preloaders/editor.js"),
				},
			},
			tabbed: false,
			autofocus: true,
			url: "file://" + __dirname + "/../../../html/editor.html",
		});
		if (isWindowMaximized ?? true) {
			this.Window.maximize();
		}
		this.Window.on("closed", () => app.quit());
		this.Window.on("close", async (e) => {
			if (this._ForceQuit) { return; }

			store.set({
				windowBounds: this.Window.getBounds(),
				isWindowMaximized: this.Window.isMaximized(),
				openedFile: Settings.OpenedFile,
				workspacePath: Settings.WorkspacePath
			});
			console.log(`Configuration settings written to ${store.path}`, store.store);

			e.preventDefault();
			this._ForceQuit = await new Promise<boolean>((resolve) => {
				ipcMain.on("quit", (_, shouldQuit) => resolve(shouldQuit));
				this.Window.webContents.send("quit");
			});

			if (this._ForceQuit) { app.quit(); }
		});

		WindowsHandler.MainWindow = this.Window;
	}

	/**
	 * Creates the short cuts
	 */
	public static CreateShortcutsAndMenu(): void {
		// Short cuts
		globalShortcut.register("CommandOrControl+ALT+I", () => {
			const win = BrowserWindow.getFocusedWindow();
			if (win) {
				win.webContents.openDevTools({
					mode: "detach"
				});
			}
		});

		// Menu
		const menu = Menu.buildFromTemplate([
			{
				label: "BabylonJS Editor",
				submenu: [
					{
						label: "Exit BabylonJS Editor",
						accelerator: "CommandOrControl+Q",
						click: () => app.quit(),
					},
				],
			},
			{
				label: "File",
				submenu: [
					{
						label: "Save",
						accelerator: "CommandOrControl+S",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("save"),
					},
					{
						label: "Save As...",
						accelerator: "CommandOrControl+Shift+S",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("save-as"),
					},
				],
			},
			{
				label: "Edit",
				submenu: [
					{
						label: "Undo",
						accelerator: "CommandOrControl+Z",
						click: () => {
							// BrowserWindow.getFocusedWindow()?.webContents.undo();
							BrowserWindow.getFocusedWindow()?.webContents.send("undo");
						},
					},
					{
						label: "Redo",
						accelerator: os.platform() === "darwin" ? "CommandOrControl+Shift+Z" : "Control+Y",
						click: () => {
							// BrowserWindow.getFocusedWindow()?.webContents.redo();
							BrowserWindow.getFocusedWindow()?.webContents.send("redo");
						},
					},
					{
						type: "separator",
					},
					{
						label: "Select All",
						accelerator: "CommandOrControl+A",
						role: "selectAll",
					},
					{
						type: "separator",
					},
					{
						label: "Copy",
						accelerator: "CommandOrControl+C",
						role: "copy",
					},
					{
						label: "Paste",
						accelerator: "CommandOrControl+V",
						role: "paste",
					},
					{
						type: "separator",
					},
					{
						label: "Search...",
						accelerator: "CommandOrControl+F",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("search"),
					},
				],
			},
			{
				label: "View",
				submenu: [
					{
						label: "Use Last Camera",
						accelerator: "Alt+C",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("switch-last-camera"),
					}
				],
			},
			{
				label: "Project",
				submenu: [
					{
						label: "Build Project...",
						accelerator: "CommandOrControl+B",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("build-project"),
					},
					{
						label: "Build And Run Project...",
						accelerator: "CommandOrControl+Shift+R",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("build-and-run-project"),
					},
					{
						type: "separator",
					},
					{
						label: "Run Project...",
						accelerator: "CommandOrControl+R",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("run-project"),
					},
					{
						type: "separator",
					},
					{
						label: "Generate Project...",
						accelerator: "CommandOrControl+G",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("generate-project"),
					},
					{
						type: "separator",
					},
					{
						label: "Play Project...",
						accelerator: "CommandOrControl+T",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("play-project"),
					}
				],
			},
			{
				label: "Window",
				submenu: [
					{
						label: "Minimize",
						accelerator: "Command+M",
						click: () => BrowserWindow.getFocusedWindow()?.minimize(),
					},
					{
						label: "Close",
						accelerator: "Command+W",
						click: () => BrowserWindow.getFocusedWindow()?.close(),
					},
				],
			}
		]);
		Menu.setApplicationMenu(menu);

		// Remove from main window. Will be useful only for MacOs
		this.Window.setMenuBarVisibility(false);
	}
}

const shouldQuit = false; // app.requestSingleInstanceLock();

if (shouldQuit) {
	app.quit();
}
else {
	app.allowRendererProcessReuse = false;

	// Enable remote debugging of both the Editor and the edited Project.
	app.commandLine.appendSwitch("remote-debugging-port", "8315");

	// Events
	app.on("second-instance", (_, argv) => {
		if (EditorApp.Window) {
			if (EditorApp.Window.isMinimized())
				EditorApp.Window.restore();

			EditorApp.Window.focus();

			const filename = EditorApp.GetFilePathArgument(argv);
			if (filename !== Settings.OpenedFile && filename !== Settings.WorkspacePath) {
				EditorApp.ConfigureSettings(filename);
				EditorApp.Window.reload();
			}
		}
	});
	app.on("window-all-closed", async () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});

	app.on("ready", () => EditorApp.Create());
	app.on("activate", () => EditorApp.Window || EditorApp.Create());

	app.on("open-file", (_, filename) => {
		if (filename !== Settings.OpenedFile && filename !== Settings.WorkspacePath) {
			EditorApp.ConfigureSettings(filename);
			EditorApp.Window?.reload();
		}
	});
}
