import { platform } from "os";
import "dotenv/config";
import { autoUpdater } from "electron-updater";
import { basename, dirname, join } from "path/posix";
import { BrowserWindow, app, globalShortcut, ipcMain, nativeTheme, shell } from "electron";
import { resolve } from "path";
import { createServer, Server } from "http";

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

// Register the custom protocol.
if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient("babylonjs-editor", process.execPath, [resolve(process.argv[1])]);
	}
} else {
	app.setAsDefaultProtocolClient("babylonjs-editor");
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
	process.exit(0);
} else {
	const oauthBaseUrl = (process.env.OAUTH_BASE_URL ?? "http://localhost:9542").replace(/\/+$/, "");
	const oauthBase = new URL(oauthBaseUrl);
	const oauthCallbackHost = oauthBase.host;
	const oauthCallbackHostname = oauthBase.hostname;
	const oauthCallbackPort = Number.parseInt(oauthBase.port || (oauthBase.protocol === "https:" ? "443" : "80"), 10);
	const oauthAllowedHosts = new Set([oauthCallbackHost]);
	if (oauthCallbackHostname === "localhost" || oauthCallbackHostname === "127.0.0.1" || oauthCallbackHostname === "::1") {
		oauthAllowedHosts.add(`localhost:${oauthCallbackPort}`);
		oauthAllowedHosts.add(`127.0.0.1:${oauthCallbackPort}`);
		oauthAllowedHosts.add(`[::1]:${oauthCallbackPort}`);
	}

	app.on("second-instance", (_event, commandLine) => {
		const url = commandLine.find((arg) => arg.startsWith("babylonjs-editor://"));
		if (url) {
			focusActiveWindow(url.includes("oauth"));
			notifyOAuthCallback(url);
		} else {
			focusActiveWindow();
		}
	});

	app.on("open-url", (event, url) => {
		event.preventDefault();
		focusActiveWindow(url.includes("oauth"));
		notifyOAuthCallback(url);
	});

	let oauthServer: Server | null = null;
	let oauthServerTimeout: NodeJS.Timeout | null = null;
	let oauthRequesterId: number | null = null;

	function focusActiveWindow(isOAuth?: boolean): void {
		const allWindows = BrowserWindow.getAllWindows();

		allWindows.forEach((w) => {
			if (!w.isDestroyed()) {
				if (w.isMinimized()) {
					w.restore();
				}
				w.show();
			}
		});

		if (isOAuth && oauthRequesterId !== null) {
			const requester = BrowserWindow.fromId(oauthRequesterId);
			if (requester && !requester.isDestroyed()) {
				requester.focus();
			}
		}
	}

	/**
	 * Starts the OAuth callback server.
	 */
	function startOAuthServer(): void {
		if (oauthServer) {
			return;
		}

		oauthServer = createServer((req, res) => {
			const host = req.headers.host;
			if (!host || !oauthAllowedHosts.has(host)) {
				res.writeHead(403);
				res.end();
				return;
			}

			const url = new URL(req.url!, `${oauthBase.protocol}//${host}`);
			if (url.pathname === "/sketchfab/callback") {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(`
					<html>
						<body style="font-family: sans-serif; background-color: #333; color: #eee; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
							<h1>Authentication Successful</h1>
							<p>Redirecting back to Babylon.js Editor...</p>
							<p id="oauth-status" style="font-size: 12px; opacity: 0.9;">If nothing happens, use the link below.</p>
							<p style="margin-top: 8px;">
								<a id="oauth-continue" href="#" style="color: #7fc8ff;">Open Babylon.js Editor</a>
							</p>
							<script>
								const hash = window.location.hash;
								const redirectUrl = "babylonjs-editor://oauth" + hash;
								const continueLink = document.getElementById("oauth-continue");
								if (continueLink) {
									continueLink.setAttribute("href", redirectUrl);
								}
								window.location.href = redirectUrl;
								setTimeout(() => window.close(), 1500);
							</script>
						</body>
					</html>
				`);

				// Stop the server after a short delay to ensure the response is sent
				setTimeout(() => stopOAuthServer(), 2000);
				return;
			}

			res.writeHead(404);
			res.end();
		});

		oauthServer.on("error", (e) => {
			console.error(`OAuth callback server error: ${e.message}`);
			stopOAuthServer();
		});

		oauthServer.listen(oauthCallbackPort, oauthCallbackHostname, () => {
			console.log(`OAuth callback server listening on ${oauthBaseUrl}`);
		});

		// Auto-stop after 5 minutes
		oauthServerTimeout = setTimeout(() => stopOAuthServer(), 5 * 60 * 1000);
	}

	/**
	 * Stops the OAuth callback server.
	 */
	function stopOAuthServer(): void {
		if (oauthServerTimeout) {
			clearTimeout(oauthServerTimeout);
			oauthServerTimeout = null;
		}

		if (oauthServer) {
			oauthServer.close();
			oauthServer = null;
			console.log("OAuth callback server stopped.");
		}
	}

	ipcMain.on("app:start-oauth-server", (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		oauthRequesterId = win?.id ?? null;
		startOAuthServer();
	});
	ipcMain.on("app:stop-oauth-server", () => stopOAuthServer());

	/**
	 * Notifies OAuth callback only to the requester window to avoid leaking callback payload.
	 */
	function notifyOAuthCallback(url: string): void {
		if (oauthRequesterId !== null) {
			const requester = BrowserWindow.fromId(oauthRequesterId);
			if (requester && !requester.isDestroyed()) {
				requester.webContents.send("app:open-url-callback", url);
				oauthRequesterId = null;
			}
		}
	}
}

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

let shouldAppQuit = false;

ipcMain.on("app:open-url", (_, url) => {
	shell.openExternal(url);
});

ipcMain.on("app:quit", () => {
	for (const window of editorWindows.slice()) {
		window.close();

		if (editorWindows.includes(window)) {
			return;
		}
	}

	if (!editorWindows.length) {
		shouldAppQuit = true;
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

function closeDashboard(): void {
	if (dashboardWindow) {
		dashboardWindow.close();
		dashboardWindow = null;
	}
}

ipcMain.on("dashboard:open-project", (_, file: string, shouldCloseDashboard?: boolean) => {
	openProject(file);
	dashboardWindow?.minimize();

	if (shouldCloseDashboard) {
		closeDashboard();
	}
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

		if (openedProjects.length === 0 && !shouldAppQuit) {
			openDashboard();
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
