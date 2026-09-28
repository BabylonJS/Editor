import { platform } from "os";
import { spawn, IPty } from "node-pty";
import { pathExistsSync } from "fs-extra";
import { ipcMain, WebContents } from "electron";

interface IStoredNodePty {
	pty: IPty;
	webContentsId: number;
}

const trackedWebContentsIds = new Set<number>();
const spawnsMap = new Map<string, IStoredNodePty>();

/**
 * Closes all the process started by the window identified by the given web contents id.
 * @param id defines the id of the web contents to close all node pty processes for.
 * @example closeAllNodePtyForWebContentsId(window.webContents.id);
 */
export function closeAllNodePtyForWebContentsId(id: number) {
	for (const [key, value] of spawnsMap) {
		if (value.webContentsId === id) {
			try {
				value.pty.kill();
			} catch (error) {
				// Process might already be killed, ignore the error
				console.log("Process already killed:", (error as Error).message);
			}
			spawnsMap.delete(key);
		}
	}
}

/**
 * Kills the processes started by the given page when it goes away without closing its window: when it is reloaded
 * or navigates elsewhere, or when its renderer process crashes. They would otherwise keep running unattended.
 * @param webContents defines the reference to the web contents that started processes.
 */
function trackWebContents(webContents: WebContents): void {
	const id = webContents.id;
	if (trackedWebContentsIds.has(id)) {
		return;
	}

	trackedWebContentsIds.add(id);

	webContents.on("did-start-navigation", (details) => {
		if (details.isMainFrame && !details.isSameDocument) {
			closeAllNodePtyForWebContentsId(id);
		}
	});

	webContents.on("render-process-gone", () => {
		closeAllNodePtyForWebContentsId(id);
	});

	webContents.once("destroyed", () => {
		closeAllNodePtyForWebContentsId(id);
		trackedWebContentsIds.delete(id);
	});
}

// On create a new pty process
ipcMain.on("editor:create-node-pty", (ev, command, id, options, forcedShell) => {
	// An executable given with its arguments is spawned as is, without going through the shell of the user,
	// so the arguments never need to be quoted for it.
	const { file, args: fileArgs, interactive: _interactive, ...ptyOptions } = options ?? {};

	let shell = process.env[platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
	if (forcedShell && forcedShell !== "Automatic" && pathExistsSync(forcedShell)) {
		shell = forcedShell;
	}

	if (!file && !shell) {
		return ev.sender.send("editor:create-node-pty", null);
	}

	// On Windows, the arguments of an executable can also be given as an already escaped command line.
	let args: string[] | string = [];
	if (file) {
		args = typeof fileArgs === "string" ? fileArgs : [...(fileArgs ?? [])];
	} else if (platform() === "darwin") {
		args = ["-l"];
	}

	const p = spawn(file ?? shell!, args, {
		cols: 80,
		rows: 30,
		name: "xterm-color",
		encoding: "utf-8",
		useConpty: false,
		cwd: options?.cwd ?? process.cwd(),
		env: options?.env ?? process.env,
		...ptyOptions,
	});

	p.onData((data) => {
		if (!ev.sender.isDestroyed()) {
			ev.sender.send(`editor:node-pty-data:${id}`, data);
		}
	});

	p.onExit((event) => {
		spawnsMap.delete(id);
		if (!ev.sender.isDestroyed()) {
			ev.sender.send(`editor:node-pty-exit:${id}`, event.exitCode);
		}
	});

	spawnsMap.set(id, {
		pty: p,
		webContentsId: ev.sender.id,
	});

	trackWebContents(ev.sender);

	ev.sender.send(`editor:create-node-pty-${id}`);

	const interactive: boolean = Boolean(options?.interactive) || Boolean(file);
	if (!interactive) {
		const hasBackSlashes = shell!.toLowerCase() === process.env["COMSPEC"]?.toLowerCase();
		if (hasBackSlashes) {
			p.write(`${command.replace(/\//g, "\\")}\n\r`);
		} else {
			p.write(`${command}\n\r`);
		}

		p.write("exit\n\r");
	}
});

// On write on a pty process
ipcMain.on("editor:node-pty-write", (_, id, data) => {
	const p = spawnsMap.get(id);
	p?.pty.write(data);
});

// On kill a pty process
ipcMain.on("editor:kill-node-pty", (_, id) => {
	const p = spawnsMap.get(id);
	if (p) {
		try {
			p.pty.kill();
		} catch (error) {
			// Process might already be killed, ignore the error
			console.log("Process already killed:", (error as Error).message);
		}
		spawnsMap.delete(id);
	}
});

// On resize node-pty process is requested
ipcMain.on("editor:resize-node-pty", (_, id, cols, rows) => {
	const p = spawnsMap.get(id);
	if (p) {
		p.pty.resize(cols, rows);
	}
});
