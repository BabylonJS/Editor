import { BrowserWindow, ipcMain, screen } from "electron";

export interface IWindowOptions {
    /**
     * The URL to load in the window.
     */
    htmlUrl: string;
}

/**
 * Creates a new window that takes up the entire screen.
 * @returns The newly created window.
 */
export async function createWindow(options: IWindowOptions): Promise<BrowserWindow> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const window = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            preload: __dirname + "/../preload.js",
        },
    });

    window.menuBarVisible = false;
    window.loadURL(options.htmlUrl);

    if (process.env.DEBUG) {
        setTimeout(() => {
            window.webContents.openDevTools();
        }, 1000);
    }

    await Promise.all([
        new Promise((resolve) => {
            window.webContents.once("did-finish-load", resolve);
        }),
        new Promise<void>((resolve) => {
            ipcMain.once("editor:ready", () => resolve());
        }),
    ]);

    window.focus();

    return window;
}
