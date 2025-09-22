import { join } from "path/posix";

/**
 * Creates a new worker and returns its reference.
 * @param path defines the relative path to the worker entry point relative to THIS file.
 */
export function loadWorker(path: string) {
	path = join(__dirname.replace(/\\/g, "/"), path);
	return new Worker(path);
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
export async function executeSimpleWorker<T>(pathOrWorker: string | Worker, data: WorkerMessageData, transfer?: Transferable[]) {
	const worker = typeof pathOrWorker === "string" ? loadWorker(pathOrWorker) : pathOrWorker;

	return new Promise<T>((resolve) => {
		worker.postMessage(data, transfer!);

		worker.addEventListener("message", (event) => {
			if (data.id && event.data.id !== data.id) {
				return;
			} else if (!data.id) {
				worker.terminate();
			}

			resolve(event.data);
		});
	});
}
