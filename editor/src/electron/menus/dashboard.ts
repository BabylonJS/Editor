import { BrowserWindow, Menu, ipcMain } from "electron";

export function setupDashboardMenu(): void {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: "Babylon.JS Editor",
            submenu: [
                {
                    click: () => ipcMain.emit("app:quit"),
                    label: "Exit BabylonJS Editor",
                    accelerator: "CommandOrControl+Q",
                },
            ],
        },
        {
            label: "File",
            submenu: [
                {
                    label: "Import Project...",
                    accelerator: "CommandOrControl+I",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("dashboard:import-project"),
                },
                {
                    type: "separator",
                },
                {
                    label: "New Project...",
                    accelerator: "CommandOrControl+N",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("dashboard:new-project"),
                },
            ],
        },
        {
            label: "Window",
            submenu: [
                {
                    label: "Minimize",
                    accelerator: "Command+M",
                    click: () => BrowserWindow.getFocusedWindow()?.minimize(),
                },
                {
                    label: "Close",
                    accelerator: "Command+W",
                    click: () => BrowserWindow.getFocusedWindow()?.close(),
                },
            ],
        }
    ]));
}
