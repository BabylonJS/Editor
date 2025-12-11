import { join } from "path";
import { app, BrowserWindow } from "electron";

// Force dedicated GPU on systems with dual graphics cards (typically laptops).
app.commandLine.appendSwitch("force_high_performance_gpu");

const isDev = process.env.DEV !== undefined;

app.on("ready", () => {
	const window = new BrowserWindow({
		show: true,
		frame: false,
		closable: true,
		minimizable: true,
		maximizable: true,
		transparent: false,
		titleBarStyle: "hidden",
		width: 1280,
		height: 800,
		webPreferences: {
			nodeIntegration: false,
			nodeIntegrationInWorker: false,
			javascript: true,
			contextIsolation: !isDev,
		},
	});

	if (isDev) {
		window.loadURL("http://localhost:3000");
	} else {
		window.loadURL(join("file://", app.getAppPath(), "dist/index.html"));
	}
});

app.on("window-all-closed", () => {
	app.quit();
});
