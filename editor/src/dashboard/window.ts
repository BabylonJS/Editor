import { join } from "path/posix";
import { app, BrowserWindow, ipcMain } from "electron";

export async function createDashboardWindow(): Promise<BrowserWindow> {
    const window = new BrowserWindow({
        show: false,
        frame: false,
        closable: true,
        minimizable: true,
        maximizable: true,
        titleBarStyle: "hidden",
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            preload: join(app.getAppPath(), "build/src/dashboard/preload.js"),
        },
    });

    if (process.env.DEBUG !== "true") {
        window.menuBarVisible = false;
    }

    window.loadURL(join("file://", app.getAppPath(), "index.html"));

    if (process.env.DEBUG) {
        setTimeout(() => {
            window.webContents.openDevTools();
        }, 1000);
    }

    await new Promise<void>((resolve) => {
        ipcMain.once("dashboard:ready", () => resolve());
    });

    return window;
}
