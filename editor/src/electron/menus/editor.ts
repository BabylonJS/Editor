import { platform } from "os";
import { BrowserWindow, Menu, app } from "electron";

export function setupEditorMenu(): void {
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
        {
            label: "Add",
            submenu: [
                {
                    label: "Transform Node",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:transform-node"),
                },
                {
                    label: "Box Mesh",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:box-mesh"),
                },
                {
                    label: "Sphere Mesh",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:sphere-mesh"),
                },
                {
                    label: "Ground Mesh",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:ground-mesh"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Point Light",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:point-light"),
                },
                {
                    label: "Directional Light",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:directional-light"),
                },
                {
                    label: "Spot Light",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:spot-light"),
                },
                {
                    label: "Hemispheric Light",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:hemispheric-light"),
                },
                {
                    type: "separator",
                },
                {
                    label: "Free Camera",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:free-camera"),
                },
                {
                    label: "Arc Rotate Camera",
                    click: () => BrowserWindow.getFocusedWindow()?.webContents.send("add:arc-rotate-camera"),
                },
            ],
        },
    ]));
}
