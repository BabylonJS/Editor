import { platform } from "os";
import { BrowserWindow, Menu, app, globalShortcut, ipcMain, nativeTheme } from "electron";

import { getFilePathArgument } from "./tools/process";

import { createDashboardWindow, createEditorWindow } from "./electron/window";

import "./electron/node-pty";
import "./electron/assimpjs";
import "./electron/dialog";
import "./electron/shell";

try {
    if (process.env.DEBUG) {
        require("electron-reloader")(module);
    }
} catch (_) { /* Catch silently */ }

app.addListener("ready", async () => {
    nativeTheme.themeSource = "system";

    globalShortcut.register("CommandOrControl+ALT+I", () => {
        BrowserWindow.getFocusedWindow()?.webContents.openDevTools({
            mode: "right",
        });
    });

    const filePath = getFilePathArgument(process.argv);
    if (filePath) {
        await openProject(filePath);
    } else {
        await openDashboard();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        openDashboard();
    }
});

app.on("second-instance", async () => {
    if (platform() === "darwin") {
        const window = await openDashboard();
        console.log(window); // TODO: setup new window (aka new project).
    }
});

ipcMain.on("dashboard:open-project", (_, file) => {
    openProject(file);
    dashboardWindow?.minimize();
});

let dashboardWindow: BrowserWindow | null = null;

async function openDashboard(): Promise<void> {
    if (!dashboardWindow) {
        dashboardWindow = await createDashboardWindow();

        dashboardWindow.on("closed", () => dashboardWindow = null);
    }

    dashboardWindow.show();
    dashboardWindow.focus();
}

const openedProjects: string[] = [];

async function openProject(filePath: string): Promise<void> {
    if (openedProjects.includes(filePath)) {
        return;
    }

    openedProjects.push(filePath);

    notifyWindows("dashboard:opened-projects", openedProjects);

    setupMenu();

    const window = await createEditorWindow();

    window.on("focus", () => setupMenu());
    window.once("closed", () => {
        openedProjects.splice(openedProjects.indexOf(filePath), 1);
        notifyWindows("dashboard:opened-projects", openedProjects);
    });

    if (platform() === "win32" && filePath) {
        window.maximize();
    }

    if (filePath) {
        window.webContents.send("editor:open", filePath);

        window.webContents.on("did-finish-load", () => {
            window.webContents.send("editor:open", filePath);
        });
    } else {
        window.webContents.send("editor:show-welcome");

        window.webContents.on("did-finish-load", () => {
            window.webContents.send("editor:show-welcome");
        });
    }
}

function notifyWindows(event: string, data: any) {
    BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send(event, data);
    });
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
                    label: "Open Project...",
                    accelerator: "CommandOrControl+O",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:open-project"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Save",
                    accelerator: "CommandOrControl+S",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("save"),
                },
                {
                    label: "Export",
                    accelerator: "CommandOrControl+G",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("export"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Open in Visual Studio Code",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:open-vscode"),
                }
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
                {
                    type: "separator",
                },
                {
                    label: "Project...",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:edit-project"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Preferences...",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:edit-preferences"),
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
                {
                    type: "separator",
                },
                {
                    label: "Focus Selected Object",
                    accelerator: "CommandOrControl+F",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("preview:focus"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Edit Camera",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("preview:edit-camera"),
                },
            ],
        },
    ]));
}
