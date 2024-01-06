import { platform } from "os";
import { BrowserWindow, Menu, app, globalShortcut, nativeTheme } from "electron";

import { createWindow } from "./electron/window";
import { getFilePathArgument } from "./tools/process";

import "./electron/node-pty";
import "./electron/assimpjs";

try {
    if (process.env.DEBUG) {
        require('electron-reloader')(module);
    }
} catch (_) { /* Catch silently */ }

app.addListener("ready", async () => {
    nativeTheme.themeSource = "system";

    globalShortcut.register("CommandOrControl+ALT+I", () => {
        BrowserWindow.getFocusedWindow()?.webContents.openDevTools({
            mode: "right",
        });
    });

    const window = await createMainWindow();

    if (platform() === "win32") {
        window.maximize();
    }

    const filePath = getFilePathArgument(process.argv);
    if (filePath) {
        window.webContents.send("editor:open", filePath);

        window.webContents.on("did-finish-load", () => {
            window.webContents.send("editor:open", filePath);
        });
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.on("second-instance", async () => {
    if (platform() === "darwin") {
        const window = await createMainWindow();
        console.log(window); // TODO: setup new window (aka new project).
    }
});

async function createMainWindow(): Promise<BrowserWindow> {
    setupMenu();

    const window = await createWindow({
        htmlUrl: "file://" + __dirname + "/../../index.html",
    });


    window.on("focus", () => setupMenu());

    return window;
}

function setupMenu(): void {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: "Babylon.JS Editor",
            submenu: [
                {
                    click: () => app.quit(),
                    label: "Exit BabylonJS Editor",
                    accelerator: "CommandOrControl+Q",
                },
            ],
        },
        {
            label: "File",
            submenu: [
                {
                    label: "Save",
                    accelerator: "CommandOrControl+S",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("save"),
                },
            ],
        },
        {
            label: "Edit",
            submenu: [
                {
                    label: "Undo",
                    accelerator: "CommandOrControl+Z",
                    click: () => {
                        // BrowserWindow.getFocusedWindow()?.webContents.undo();
                        BrowserWindow.getFocusedWindow()?.webContents.send("undo");
                    },
                },
                {
                    label: "Redo",
                    accelerator: platform() === "darwin" ? "CommandOrControl+Shift+Z" : "Control+Y",
                    click: () => {
                        // BrowserWindow.getFocusedWindow()?.webContents.redo();
                        BrowserWindow.getFocusedWindow()?.webContents.send("redo");
                    },
                },
                {
                    type: "separator",
                },
                {
                    label: "Select All",
                    accelerator: "CommandOrControl+A",
                    role: "selectAll",
                },
                {
                    type: "separator",
                },
                {
                    role: "copy",
                    label: "Copy",
                    accelerator: "CommandOrControl+C",
                },
                {
                    role: "paste",
                    label: "Paste",
                    accelerator: "CommandOrControl+V",
                },
            ],
        },
        {
            label: "Preview",
            submenu: [
                {
                    label: "Position",
                    accelerator: "CommandOrControl+T",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("gizmo:position"),
                },
                {
                    label: "Rotation",
                    accelerator: "CommandOrControl+R",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("gizmo:rotation"),
                },
                {
                    label: "Scaling",
                    accelerator: "CommandOrControl+W",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("gizmo:scaling"),
                },
            ],
        },
    ]));
}
