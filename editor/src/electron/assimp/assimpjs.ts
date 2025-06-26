import { join } from "path/posix";
import { Worker } from "worker_threads";

import { ipcMain } from "electron";

ipcMain.on("editor:load-model", async (ev, messageId, absolutePath, content) => {
	const worker = new Worker(join(__dirname, "./assimpjs-worker.js"), {
		workerData: {
			content,
			absolutePath,
		},
	});

	worker.on("message", (data) => {
		worker.terminate();
		ev.sender.send(messageId, data);
	});
});
