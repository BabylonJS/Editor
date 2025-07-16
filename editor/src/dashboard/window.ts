import { join } from "path/posix";
import { app, BrowserWindow, ipcMain } from "electron";

export async function createDashboardWindow(): Promise<BrowserWindow> {
	const window = new BrowserWindow({
		show: false,
		frame: false,
		closable: true,
		minimizable: true,
		maximizable: true,
		transparent: false,
		titleBarStyle: "hidden",
		width: 1280,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: process.env.DEBUG !== "true",
			preload: join(app.getAppPath(), "build/src/dashboard/preload.js"),
		},
	});

	if (process.env.DEBUG !== "true") {
		window.menuBarVisible = false;
	}

	window.loadURL(join("file://", app.getAppPath(), "index.html"));
	window.center();

	if (process.env.DEBUG) {
		setTimeout(() => {
			window.webContents.openDevTools();
		}, 1000);
	}

	await new Promise<void>((resolve) => {
		ipcMain.once("dashboard:ready", () => resolve());
	});

	return window;
}
