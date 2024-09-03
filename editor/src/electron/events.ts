import { BrowserWindow, ipcMain } from "electron";

ipcMain.on("editor:asset-updated", (ev, type, data) => {
    const window = BrowserWindow.getAllWindows().find((w) => w.webContents.id === ev.sender.id);
    const parent = window?.getParentWindow();

    if (!parent) {
        return;
    }

    parent.webContents.send("editor:asset-updated", type, data);
});
