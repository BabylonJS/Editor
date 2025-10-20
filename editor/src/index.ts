import { platform } from "os";
import { autoUpdater } from "electron-updater";
import { basename, dirname, join } from "path/posix";
import { BrowserWindow, app, globalShortcut, ipcMain, nativeTheme } from "electron";

import { getFilePathArgument } from "./tools/process";

import { setupEditorMenu } from "./editor/menu";

import { setupDashboardMenu } from "./dashboard/menu";
import { createDashboardWindow } from "./dashboard/window";

import { createEditorWindow, editorWindows } from "./editor/window";

import "./electron/node-pty";
import "./electron/events/shell";
import "./electron/events/dialog";
import "./electron/events/editor";
import "./electron/events/window";
import "./electron/assimp/assimpjs";
import "./electron/events/export";

try {
	if (!app.isPackaged) {
		process.env.DEBUG ??= "true";
	}

	if (process.env.DEBUG) {
		require("electron-reloader")(module);
	}
} catch (_) {
	/* Catch silently */
}

// Enable remote debugging of both the Editor and the edited Project.
app.commandLine.appendSwitch("remote-debugging-port", "8315");

// Force dedicated GPU on systems with dual graphics cards (typically laptops).
app.commandLine.appendSwitch("force_high_performance_gpu");

app.addListener("ready", async () => {
	nativeTheme.themeSource = "system";

	globalShortcut.register("CommandOrControl+ALT+I", () => {
		BrowserWindow.getFocusedWindow()?.webContents.openDevTools({
			mode: "right",
		});
	});

	const filePath = getFilePathArgument(process.argv);
	if (filePath) {
		await openProject(filePath);
	} else {
		await openDashboard();
	}

	autoUpdater.checkForUpdatesAndNotify();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		openDashboard();
	}
});

app.on("second-instance", async () => {
	if (platform() === "darwin") {
		const window = await openDashboard();
		console.log(window); // TODO: setup new window (aka new project).
	}
});

ipcMain.on("app:quit", () => {
	for (const window of editorWindows.slice()) {
		window.close();

		if (editorWindows.includes(window)) {
			return;
		}
	}

	if (!editorWindows.length) {
		app.quit();
	}
});

let dashboardWindow: BrowserWindow | null = null;

async function openDashboard(): Promise<void> {
	if (!dashboardWindow) {
		setupDashboardMenu();

		dashboardWindow = await createDashboardWindow();
		dashboardWindow.setTitle("Dashboard");

		dashboardWindow.on("focus", () => setupDashboardMenu());
		dashboardWindow.on("closed", () => (dashboardWindow = null));
	}

	dashboardWindow.show();
	dashboardWindow.focus();
}

ipcMain.on("dashboard:open-project", (_, file) => {
	openProject(file);
	dashboardWindow?.minimize();
});

ipcMain.on("dashboard:update-projects", () => {
	dashboardWindow?.webContents.send("dashboard:update-projects");
});

const openedProjects: string[] = [];

async function openProject(filePath: string): Promise<void> {
	if (openedProjects.includes(filePath)) {
		return;
	}

	openedProjects.push(filePath);

	notifyWindows("dashboard:opened-projects", openedProjects);

	setupEditorMenu();

	const window = await createEditorWindow();
	window.setTitle(basename(dirname(filePath)));

	window.on("focus", () => setupEditorMenu());
	window.once("closed", () => {
		openedProjects.splice(openedProjects.indexOf(filePath), 1);
		notifyWindows("dashboard:opened-projects", openedProjects);

		if (openedProjects.length === 0) {
			dashboardWindow?.restore();
		}
	});

	if (filePath) {
		window.maximize();
	}

	if (filePath) {
		window.webContents.send("editor:open", filePath);
		window.webContents.send("editor:path", join(app.getAppPath()));

		window.webContents.on("did-finish-load", () => {
			window.webContents.send("editor:open", filePath);
			window.webContents.send("editor:path", join(app.getAppPath()));
		});
	}
}

function notifyWindows(event: string, data: any) {
	BrowserWindow.getAllWindows().forEach((window) => {
		window.webContents.send(event, data);
	});
}
