import { join } from "path/posix";
import { app, BrowserWindow, dialog, ipcMain, nativeImage, screen } from "electron";

import { isWindows } from "../tools/os";

import { closeAllNodePtyForWebContentsId } from "../electron/node-pty";

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
            contextIsolation: process.env.DEBUG !== "true",
            preload: join(app.getAppPath(), "build/src/editor/preload.js"),
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

        BrowserWindow.getAllWindows().slice(0).forEach((w) => {
            if (w.getParentWindow() === window) {
                w.close();
                closeAllNodePtyForWebContentsId(w.webContents.id);
            }
        });

        window.webContents.send("editor:closed");

        const index = editorWindows.indexOf(window);
        if (index !== -1) {
            editorWindows.splice(index, 1);
        }

        closeAllNodePtyForWebContentsId(window.webContents.id);
    });

    window.loadURL(join("file://", app.getAppPath(), "index.html"));

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
            contextIsolation: process.env.DEBUG !== "true",
            preload: join(app.getAppPath(), "build/src/splash/preload.js"),
        }
    });

    splash.loadURL(join("file://", app.getAppPath(), "index.html"));
    splash.center();

    await Promise.all([
        new Promise<void>((resolve) => {
            window.webContents.once("did-finish-load", () => resolve());
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
 * Opens a new custom window that will require the given index.js file and will instantiate the content of it using the given options.
 * @param indexPath defines the path to the index.js file to require for the window (entry point). The path is relative to the app path.
 * @param options defines the optional options to pass to the window main component exported by default by the index.js required file.
 * @example ipcRenderer.send("window:open", "build/src/editor/windows/nme", { filePath: "my-material.material"  });
 */
export async function createCustomWindow(indexPath: string, options: any): Promise<BrowserWindow> {
    const window = new BrowserWindow({
        show: true,
        frame: false,
        closable: true,
        minimizable: true,
        maximizable: true,
        titleBarStyle: "hidden",
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            preload: join(app.getAppPath(), "build/src/editor/windows/preload.js"),
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

    window.webContents.on("did-finish-load", () => {
        window.webContents.send("editor:window-launch-data", join(app.getAppPath(), indexPath), options);
    });

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
