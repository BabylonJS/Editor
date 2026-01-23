import { join } from "node:path/posix";
import { Worker } from "node:worker_threads";

/**
 * Creates a new worker and returns its reference.
 * @param path defines the relative path to the worker entry point relative to THIS file.
 */
export function loadWorker(path: string, workerData: WorkerMessageData) {
	path = join(import.meta.dirname.replace(/\\/g, "/"), path);
	return new Worker(path, {
		workerData,
	});
}

export type WorkerMessageData = { id?: string } & Record<string, any>;

/**
 * Creates a new worker and returns the result computed by the worker.
 * Posts the given message data to the worker and waits until the worker posts a message back.
 * @param path defines the relative path to the worker according to THIS file. Typically "workers/myWorker.js".
 * @param data defines the data object posted to the worker once it has been initialized.
 * @param transfer defines the optional transferable objects to pass to the worker.
 * @returns a promise that resolves with the data posted by the worker.
 */
export async function executeSimpleWorker<T>(pathOrWorker: string, data: WorkerMessageData) {
	const worker = loadWorker(pathOrWorker, data);

	return new Promise<T>((resolve) => {
		worker.on("message", (result) => {
			if (data.id && result.id !== data.id) {
				return;
			} else if (!data.id) {
				worker.terminate();
			}

			resolve(result);
		});
	});
}
