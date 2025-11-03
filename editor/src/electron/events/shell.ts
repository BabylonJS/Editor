import { platform } from "os";
import { ipcMain, shell } from "electron";

ipcMain.on("editor:trash-items", async (ev, items) => {
	const isWindows = platform() === "win32";
	items = items.map((item) => (isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/")));

	try {
		await Promise.all(items.map((item) => shell.trashItem(item)));
		ev.returnValue = true;
	} catch (e) {
		console.error(e);
		ev.returnValue = false;
	}
});

ipcMain.on("editor:show-item", (_, item) => {
	const isWindows = platform() === "win32";
	item = isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/");

	shell.showItemInFolder(item);
});

ipcMain.on("editor:open-in-external-editor", (_, item) => {
	const isWindows = platform() === "win32";
	item = isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/");

	shell.openPath(item);
});

ipcMain.on("editor:open-with", (_, item) => {
	const isWindows = platform() === "win32";
	item = isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/");

	shell.openPath(item);
});
