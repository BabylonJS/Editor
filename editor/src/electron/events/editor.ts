import { BrowserWindow, ipcMain } from "electron";

ipcMain.on("editor:asset-updated", (ev, type, data) => {
	BrowserWindow.getAllWindows().forEach((w) => {
		if (w.webContents.id !== ev.sender.id) {
			w.webContents.send("editor:asset-updated", type, data);
		}
	});
});

// Returns the path to the executable of the application. With the "ELECTRON_RUN_AS_NODE" environment variable set,
// it runs scripts like Node.js does: the editor needs no Node.js installation to start its MCP server.
ipcMain.on("editor:get-executable-path", (ev) => {
	ev.returnValue = process.execPath;
});
