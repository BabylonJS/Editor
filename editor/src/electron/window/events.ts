import { BrowserWindow, ipcMain } from "electron";

import { createCustomWindow } from "./window";

ipcMain.on("window:minimize", async (ev) => {
    const window = BrowserWindow.getAllWindows().find((w) => w.webContents.id === ev.sender.id);
    window?.minimize();
});

ipcMain.on("window:maximize", async (ev) => {
    const window = BrowserWindow.getAllWindows().find((w) => w.webContents.id === ev.sender.id);
    if (window) {
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    }
});

ipcMain.on("window:close", async (ev) => {
    const window = BrowserWindow.getAllWindows().find((w) => w.webContents.id === ev.sender.id);
    window?.close();
});

ipcMain.on("window:open", async (ev, indexPath, options) => {
    const newWindow = await createCustomWindow(indexPath, options);

    if (options.tabbed) {
        const parentWindow = BrowserWindow.fromWebContents(ev.sender);
        parentWindow?.addTabbedWindow(newWindow);
    }
});
