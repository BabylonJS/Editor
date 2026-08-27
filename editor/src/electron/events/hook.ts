import { app, ipcMain } from "electron";

ipcMain.on("editor:project-hook", (_, content) => {
	if (app.isPackaged) {
		try {
			fetch("https://editor.babylonjs.com/api/hooks/project", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content,
				}),
			});
		} catch (e) {
			// Catch silently.
		}
	}
});
