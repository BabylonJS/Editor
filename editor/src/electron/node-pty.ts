import { platform } from "os";

import { ipcMain } from "electron";
import { spawn, IPty } from "node-pty";

interface IStoredNodePty {
    pty: IPty;
    webContentsId: number;
}

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
				console.log('Process already killed:', error.message);
			}
			spawnsMap.delete(key);
		}
	}
}

// On create a new pty process
ipcMain.on("editor:create-node-pty", (ev, command, id, options) => {
	const shell = process.env[platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
	if (!shell) {
		return ev.sender.send("editor:create-node-pty", null);
	}

	const args: string[] = [];
	if (platform() === "darwin") {
		args.push("-l");
	}

	const p = spawn(shell!, args, {
		cols: 80,
		rows: 30,
		name: "xterm-color",
		encoding: "utf-8",
		useConpty: false,
		...options,
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

	ev.sender.send(`editor:create-node-pty-${id}`);

	const hasBackSlashes = shell!.toLowerCase() === process.env["COMSPEC"]?.toLowerCase();
	if (hasBackSlashes) {
		p.write(`${command.replace(/\//g, "\\")}\n\r`);
	} else {
		p.write(`${command}\n\r`);
	}

	p.write("exit\n\r");
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
			console.log('Process already killed:', error.message);
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
