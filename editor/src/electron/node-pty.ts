import { platform } from "os";

import { ipcMain } from "electron";
import { spawn, IPty } from "node-pty";

const spawnsMap = new Map<string, IPty>();

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
        ev.sender.send(`editor:node-pty-data:${id}`, data);
    });

    p.onExit(() => {
        spawnsMap.delete(id);
        p.kill();
        ev.sender.send(`editor:node-pty-exit:${id}`);
    });

    const hasBackSlashes = shell!.toLowerCase() === process.env["COMSPEC"]?.toLowerCase();
    if (hasBackSlashes) {
        p.write(`${command.replace(/\//g, "\\")}\n\r`);
    } else {
        p.write(`${command}\n\r`);
    }

    p.write("exit\n\r");

    spawnsMap.set(id, p);

    ev.sender.send(`editor:create-node-pty-${id}`);
});

// On write on a pty process
ipcMain.on("editor:node-pty-write", (_, id, data) => {
    const p = spawnsMap.get(id);
    p?.write(data);
});

// On kill a pty process
ipcMain.on("editor:kill-node-pty", (_, id) => {
    const p = spawnsMap.get(id);
    if (p) {
        p.kill();
        spawnsMap.delete(id);
    }
});
