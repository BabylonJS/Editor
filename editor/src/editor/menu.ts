import { platform } from "os";
import { BrowserWindow, Menu } from "electron";
import { getMeshCommands } from "./dialogs/command-palette/mesh";
import { getLightCommands } from "./dialogs/command-palette/light";
import { getCameraCommands } from "./dialogs/command-palette/camera";

export function setupEditorMenu(): void {
	Menu.setApplicationMenu(Menu.buildFromTemplate([
		{
			label: "Babylon.JS Editor",
			submenu: [
				{
					label: "Exit BabylonJS Editor",
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
					label: "Run Project",
					accelerator: "CommandOrControl+B",
					click: () => BrowserWindow.getFocusedWindow()?.webContents.send("preview:run-project"),
				},
			],
		},
		{
			label: "Add",
			submenu: [
				...getMeshCommands().map((command) => ({
					label: command.text,
					click: () => BrowserWindow.getFocusedWindow()?.webContents.send(`add:${command.ipcRendererChannelKey}`),
				})),
				{
					type: "separator",
				},
				...getLightCommands().map((command) => ({
					label: command.text,
					click: () => BrowserWindow.getFocusedWindow()?.webContents.send(`add:${command.ipcRendererChannelKey}`),
				})),
				{
					type: "separator",
				},
				...getCameraCommands().map((command) => ({
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
		}
	]));
}
