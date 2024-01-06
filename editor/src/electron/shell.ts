import { platform } from "os";
import { ipcMain, shell } from "electron";

ipcMain.on("editor:trash-items", async (ev, items) => {
    items = platform() === "darwin"
        ? items.map((item) => item.replace(/\\/g, "/"))
        : items.map((item) => item.replace(/\//g, "\\"));

    try {
        await Promise.all(items.map((item) => shell.trashItem(item)));
        ev.returnValue = true;
    } catch (e) {
        console.error(e);
        ev.returnValue = false;
    }
});
