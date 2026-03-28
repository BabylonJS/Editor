import { resolve } from "path";
import { app, ipcMain, shell } from "electron";

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient("babylonjs-editor", process.execPath, [resolve(process.argv[1])]);
	}
} else {
	app.setAsDefaultProtocolClient("babylonjs-editor");
}

ipcMain.on("app:open-url", (_, url) => {
	shell.openExternal(url);
});
