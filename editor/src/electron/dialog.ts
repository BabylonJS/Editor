import { ipcMain, dialog } from "electron";

ipcMain.on("editor:open-single-file-dialog", async (ev, title, filters) => {
    const result = await dialog.showOpenDialog({
        title,
        filters,
        properties: ["openFile"],
    });

    ev.returnValue = result.filePaths[0]?.replace(/\\/g, "/") ?? "";
});

ipcMain.on("editor:open-multiple-files-dialog", async (ev, title, filters) => {
    const result = await dialog.showOpenDialog({
        title,
        filters,
        properties: ["openFile", "multiSelections"],
    });

    ev.returnValue = result.filePaths.map((file) => file.replace(/\\/g, "/"));
});

ipcMain.on("editor:open-single-folder-dialog", async (ev, title) => {
    const result = await dialog.showOpenDialog({
        title,
        properties: ["openDirectory", "createDirectory"],
    });

    ev.returnValue = result.filePaths[0]?.replace(/\\/g, "/") ?? "";
});

ipcMain.on("editor:save-single-file-dialog", async (ev, title, filters) => {
    const result = await dialog.showSaveDialog({
        title,
        filters,
        properties: ["createDirectory", "showOverwriteConfirmation"]
    });

    ev.returnValue = result.filePath?.replace(/\\/g, "/") ?? "";
});
