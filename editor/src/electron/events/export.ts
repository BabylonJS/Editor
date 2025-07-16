import { BrowserWindow, ipcMain } from "electron";

ipcMain.on("editor:export-progress", (ev, progress) => {
	const window = BrowserWindow.getAllWindows().find((w) => w.webContents.id === ev.sender.id);

	if (progress >= 1) {
		window?.setProgressBar(-1);
	} else {
		window?.setProgressBar(progress);
	}
});
