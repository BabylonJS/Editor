import { platform } from "os";
import { BrowserWindow, app, globalShortcut, ipcMain, nativeTheme } from "electron";

import { getFilePathArgument } from "./tools/process";

import { setupEditorMenu } from "./electron/menus/editor";
import { setupDashboardMenu } from "./electron/menus/dashboard";
import { createDashboardWindow, createEditorWindow } from "./electron/window";

import "./electron/shell";
import "./electron/dialog";
import "./electron/node-pty";
import "./electron/assimp/assimpjs";

try {
    if (process.env.DEBUG) {
        require("electron-reloader")(module);
    }
} catch (_) { /* Catch silently */ }

// Enable remote debugging of both the Editor and the edited Project.
app.commandLine.appendSwitch("remote-debugging-port", "8315");

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

ipcMain.on("dashboard:update-projects", () => {
    dashboardWindow?.webContents.send("dashboard:update-projects");
});

ipcMain.on("app:quit", () => {
    app.quit();
});

let dashboardWindow: BrowserWindow | null = null;

async function openDashboard(): Promise<void> {
    if (!dashboardWindow) {

        setupDashboardMenu();

        dashboardWindow = await createDashboardWindow();

        dashboardWindow.on("focus", () => setupDashboardMenu());
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

    setupEditorMenu();

    const window = await createEditorWindow();

    window.on("focus", () => setupEditorMenu());
    window.once("closed", () => {
        openedProjects.splice(openedProjects.indexOf(filePath), 1);
        notifyWindows("dashboard:opened-projects", openedProjects);

        if (openedProjects.length === 0) {
            dashboardWindow?.restore();
        }
    });

    if (platform() === "win32" && filePath) {
        window.maximize();
    }

    if (filePath) {
        window.webContents.send("editor:open", filePath);

        window.webContents.on("did-finish-load", () => {
            window.webContents.send("editor:open", filePath);
        });
    }
}

function notifyWindows(event: string, data: any) {
    BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send(event, data);
    });
}
