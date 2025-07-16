import { BrowserWindow, Menu, ipcMain } from "electron";

import { isDarwin } from "../tools/os";

export function setupDashboardMenu(): void {
	Menu.setApplicationMenu(Menu.buildFromTemplate([
		{
			label: "Babylon.js Editor",
			submenu: [
				{
					click: () => ipcMain.emit("app:quit"),
					label: "Exit Babylon.js Editor",
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
			label: "Edit",
			submenu: [
				{
					label: "Undo",
					accelerator: "CommandOrControl+Z",
					click: () => {
						BrowserWindow.getFocusedWindow()?.webContents.undo();
						// BrowserWindow.getFocusedWindow()?.webContents.send("undo");
					},
				},
				{
					label: "Redo",
					accelerator: isDarwin() ? "CommandOrControl+Shift+Z" : "Control+Y",
					click: () => {
						BrowserWindow.getFocusedWindow()?.webContents.redo();
						// BrowserWindow.getFocusedWindow()?.webContents.send("redo");
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
