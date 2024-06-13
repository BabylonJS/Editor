import { BrowserWindow, Menu, app } from "electron";

export function setupDashboardMenu(): void {
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
    ]));
}
