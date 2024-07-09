/**
 * Creates a new worker and returns the result computed by the worker.
 * Posts the given message data to the worker and waits until the worker posts a message back.
 * @param path defines the absolute path to the worker. Typically join(__dirname, "./myWorker.js").
 * @param data defines the data object posted to the worker once it has been initialized.
 * @returns a promise that resolves with the data posted by the worker.
 */
export async function executeSimpleWorker<T>(path: string, data: any) {
    const worker = new Worker(path);
    worker.postMessage(data);

    return new Promise<T>((resolve) => {
        worker.addEventListener("message", (event) => {
            worker.terminate();
            resolve(event.data);
        });
    });
}
