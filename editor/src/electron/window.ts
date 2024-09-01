import { join } from "path/posix";
import { app, BrowserWindow, dialog, ipcMain, nativeImage, screen } from "electron";

import { isWindows } from "../tools/os";

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
            preload: __dirname + "/../dashboard/preload.js",
        },
    });

    if (process.env.DEBUG !== "true") {
        window.menuBarVisible = false;
    }

    window.loadURL("file://" + __dirname + "/../../../index.html");

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

/**
 * Defines the list of all available editor windows that are opened.
 */
export const editorWindows: BrowserWindow[] = [];

/**
 * Creates a new window that takes up the entire screen.
 * @returns The newly created window.
 */
export async function createEditorWindow(): Promise<BrowserWindow> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = {
        width: primaryDisplay.workAreaSize.width * 0.75,
        height: primaryDisplay.workAreaSize.height * 0.75,
    };

    const window = new BrowserWindow({
        show: false,
        frame: false,
        closable: true,
        minimizable: true,
        maximizable: true,
        titleBarStyle: "hidden",
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            preload: __dirname + "/../preload.js",
        },
    });

    editorWindows.push(window);

    if (process.env.DEBUG !== "true") {
        window.menuBarVisible = false;
    }

    let checkClose = true;

    window.on("close", (event) => {
        if (!checkClose) {
            return;
        }

        window.focus();

        const close = showCloseEditorWindowsDialog(window);

        if (!close) {
            return event.preventDefault();
        }

        checkClose = false;

        window.webContents.send("editor:closed");

        const index = editorWindows.indexOf(window);
        if (index !== -1) {
            editorWindows.splice(index, 1);
        }

    });

    window.loadURL("file://" + __dirname + "/../../../index.html");

    if (process.env.DEBUG) {
        setTimeout(() => {
            window.webContents.openDevTools();
        }, 1000);
    }

    const splash = new BrowserWindow({
        width: 480,
        height: 320,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            preload: __dirname + "/../splash/preload.js",
        }
    });

    splash.loadURL("file://" + __dirname + "/../../../index.html");
    splash.center();

    await Promise.all([
        new Promise((resolve) => {
            window.webContents.once("did-finish-load", resolve);
        }),
        new Promise<void>((resolve) => {
            ipcMain.once("editor:ready", () => resolve());
        }),
    ]);

    splash.close();

    window.show();
    window.focus();

    return window;
}

/**
 * Shows the close editor window dialog. This is used to get a confirmation from the user that the window
 * should be closed and is not due to a miss-click or bad keyboard shortcut.
 * @param window defines the reference to the window to show the dialog in.
 */
export function showCloseEditorWindowsDialog(window: BrowserWindow): boolean {
    const result = dialog.showMessageBoxSync(window, {
        type: "question",
        buttons: ["Yes", "No"],
        title: "Close window",
        message: "Are you sure you want to close the window?",
        icon: isWindows()
            ? nativeImage.createFromPath(join(app.getAppPath(), "assets/babylonjs_icon.png"))
            : undefined,
    });

    return result === 0;
}

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
