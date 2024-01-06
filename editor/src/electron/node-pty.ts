import { platform } from "os";
import { randomUUID } from "crypto";

import { ipcMain } from "electron";
import { spawn, IPty } from "node-pty";

const spawnsMap = new Map<string, IPty>();

// On create a new pty process
ipcMain.on("editor:create-node-pty", (ev, command, options) => {
    const shell = process.env[platform() === "win32" ? "COMSPEC" : "SHELL"] ?? null;
    if (!shell) {
        ev.sender.send("editor:create-node-pty", null);
    }

    const id = randomUUID();

    const args: string[] = [];
    if (platform() === "darwin") {
        args.push("-l");
    }

    const p = spawn(command, args, {
        cols: 80,
        rows: 30,
        name: "xterm-color",
        ...options,
    });

    p.onData((data) => {
        ev.sender.send(`editor:node-pty-data:${id}`, data);
    });

    spawnsMap.set(id, p);

    ev.sender.send("editor:create-node-pty", id);
});

// On kill a pty process
ipcMain.on("editor:kill-node-pty", (_, id) => {
    const p = spawnsMap.get(id);
    if (p) {
        p?.kill();
        spawnsMap.delete(id);
    }
});
