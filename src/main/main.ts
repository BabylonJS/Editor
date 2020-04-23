import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import { extname } from "path";

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
	 * @param fileArgumentPath the file opened
	 */
	public static ConfigureSettings(fileArgumentPath: string): void {
		if (!fileArgumentPath) { return; }
		Settings.OpenedFile = null;
		Settings.WorkspacePath = null;

		const extension = extname(fileArgumentPath).toLowerCase();
		switch (extension) {
			case ".editorproject": Settings.OpenedFile = fileArgumentPath; break;
			case ".editorworkspace": Settings.WorkspacePath = fileArgumentPath; break;
			default: break;
		}
	}

    /**
     * Creates a new window
     */
	public static async CreateWindow(): Promise<void> {
		// Save the opened file from the OS file explorer
		this.ConfigureSettings(process.argv[1]);

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
				},
			},
			url: "file://" + __dirname + "/../../../../html/editor.html",
			autofocus: true,
		});
		this.Window.maximize();
		this.Window.on("closed", () => app.quit());
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
	app.on("second-instance", (argv) => {
		if (EditorApp.Window) {
			if (EditorApp.Window.isMinimized())
				EditorApp.Window.restore();
	
			EditorApp.Window.focus();
	
			const filename = argv[1];
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
