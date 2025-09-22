import { platform } from "os";
import { BrowserWindow, Menu, shell } from "electron";

import { cameraCommandItems, lightCommandItems, meshCommandItems } from "./dialogs/command-palette/shared-commands";

export function setupEditorMenu(): void {
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{
				label: "Babylon.js Editor",
				submenu: [
					{
						label: "About Babylon.js Editor",
						role: "about",
					},
					{
						type: "separator",
					},
					{
						label: "Preferences...",
						accelerator: "Command+,",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:edit-preferences"),
					},
					{
						type: "separator",
					},
					{
						label: "Exit Babylon.js Editor",
						accelerator: "CommandOrControl+Q",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:quit-app"),
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
						label: "Generate",
						accelerator: "CommandOrControl+G",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("generate"),
					},
					{
						type: "separator",
					},
					{
						label: "Open in Visual Studio Code",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:open-vscode"),
					},
					{
						type: "separator",
					},
					{
						label: "Run Project...",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:run-project"),
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
					{
						type: "separator",
					},
					{
						label: "Project...",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:edit-project"),
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
						accelerator: "CommandOrControl+D",
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
					{
						type: "separator",
					},
					{
						label: "Play Scene",
						accelerator: "CommandOrControl+B",
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("preview:play-scene"),
					},
				],
			},
			{
				label: "Add",
				submenu: [
					...Object.values(meshCommandItems).map((command) => ({
						label: command.text,
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send(`add:${command.ipcRendererChannelKey}`),
					})),
					{
						type: "separator",
					},
					...Object.values(lightCommandItems).map((command) => ({
						label: command.text,
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send(`add:${command.ipcRendererChannelKey}`),
					})),
					{
						type: "separator",
					},
					...Object.values(cameraCommandItems).map((command) => ({
						label: command.text,
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send(`add:${command.ipcRendererChannelKey}`),
					})),
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
						click: () => BrowserWindow.getFocusedWindow()?.webContents.send("editor:close-window"),
					},
				],
			},
			{
				label: "Help",
				submenu: [
					{
						label: "Editor Documentation...",
						click: () => shell.openExternal("https://editor.babylonjs.com/documentation"),
					},
					{
						label: "Babylon.js Documentation...",
						click: () => shell.openExternal("https://doc.babylonjs.com"),
					},
					{
						type: "separator",
					},
					{
						label: "Babylon.js Forum...",
						click: () => shell.openExternal("https://forum.babylonjs.com"),
					},
					{
						type: "separator",
					},
					{
						label: "Report an Issue...",
						click: () => shell.openExternal("https://forum.babylonjs.com/c/bugs"),
					},
				],
			},
		])
	);
}
