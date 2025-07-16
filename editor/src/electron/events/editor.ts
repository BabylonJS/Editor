import { BrowserWindow, ipcMain } from "electron";

ipcMain.on("editor:asset-updated", (ev, type, data) => {
	BrowserWindow.getAllWindows().forEach((w) => {
		if (w.webContents.id !== ev.sender.id) {
			w.webContents.send("editor:asset-updated", type, data);
		}
	});
});
