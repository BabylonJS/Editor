import { app, BrowserWindow, globalShortcut, Menu, ipcMain } from "electron";
import { extname } from "path";
import * as os from "os";

import { Undefinable } from "../shared/types";

import { Settings } from "./settings";
import { IPC } from "./ipc";
import { WindowController } from "./window";

export default class EditorApp {
    /**
	 * The main editor's window reference (electron)
	 */
	public static Window: BrowserWindow;
	/**
	 * Reference to the IPC handler.
	 */
	public static IPCHandler: IPC;

	private static _forceQuit: boolean = false;

    /**
     * Creates a new Electron window
     */
	public static async Create(): Promise<void> {
		// Create window
		await this.CreateWindow();

		// Instantiate IPC handler
		this.IPCHandler = new IPC(this.Window);

		// Create short cuts
		this.CreateShortcutsAndMenu();
	}

	/**
	 * Configures the app's settings according to the opened file.
	 * @param filePathArgument the file opened
	 */
	public static ConfigureSettings(filePathArgument: Undefinable<string>): void {
		if (!filePathArgument) { return; }
		Settings.OpenedFile = null;
		Settings.WorkspacePath = null;

		const extension = extname(filePathArgument).toLowerCase();
		switch (extension) {
			case ".editorproject": Settings.OpenedFile = filePathArgument; break;
			case ".editorworkspace": Settings.WorkspacePath = filePathArgument; break;
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
		if (platform === "darwin") {
			return argv[2];
		}

		return argv[1];
	}

    /**
     * Creates a new window
     */
	public static async CreateWindow(): Promise<void> {
		// Save the opened file from the OS file explorer
		this.ConfigureSettings(this.GetFilePathArgument(process.argv));

		this.Window = await WindowController.WindowOnDemand({
			options: {
				width: 800,
				height: 600,
				title: "Babylon.JS Editor Preview",
				webPreferences: {
					scrollBounce: true,
					nodeIntegration: true,
					nodeIntegrationInWorker: true,
					nativeWindowOpen: false,
					nodeIntegrationInSubFrames: true,
					allowRunningInsecureContent: false,
				},
			},
			url: "file://" + __dirname + "/../../../../html/editor.html",
			autofocus: true,
		});
		this.Window.maximize();
		this.Window.on("closed", () => app.quit());
		this.Window.on("close", async (e) => {
			if (this._forceQuit) { return; }

			e.preventDefault();
			this._forceQuit = await new Promise<boolean>((resolve) => {
				ipcMain.on("quit", (_, shouldQuit) => resolve(shouldQuit));
				this.Window.webContents.send("quit");
			});

			if (this._forceQuit) { app.quit(); }
		});
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
		Menu.setApplicationMenu(null);
	}
}

const shouldQuit = false; // app.requestSingleInstanceLock();

if (shouldQuit) {
	app.quit();
}
else {
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
		if (process.platform !== "darwin")
			app.quit();
	});

	app.on("ready", () => EditorApp.Create());
	app.on("activate", () => EditorApp.Window || EditorApp.Create());
}
