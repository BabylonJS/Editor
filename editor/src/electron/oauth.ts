import { app, BrowserWindow, ipcMain } from "electron";
import { createServer, Server } from "http";

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
