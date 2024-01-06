import { join } from "path/posix";

export class WorkerTools {
    /**
     * Adds a new worker and waits for its initialization.
     * @param jsPath defines the name of the JS file to load for the worker.
     */
    public static AddWorker(jsPath: string): Promise<Worker> {
        return new Promise<Worker>((resolve) => {
            const worker = new Worker(join(__dirname, "workers", jsPath));
            let initializeFn: (this: Worker, ev: MessageEvent<any>) => any;

            worker.addEventListener("message", initializeFn = (ev) => {
                if (ev.data !== "initialized") { return; }

                worker.removeEventListener("message", initializeFn);
                resolve(worker);
            });
        });
    }

    /**
     * Computes the given function id in the worker.
     * @param worker defines the reference to the worker.
     * @param functionId defines the id of the message or function to compute.
     * @param message defines the data of the message to send.
     */
    public static Compute<T>(worker: Worker, functionId: string, message: any): Promise<T> {
        return new Promise<T>((resolve) => {
            let initializeFn: (this: Worker, ev: MessageEvent<any>) => any;
            worker.addEventListener("message", initializeFn = (ev) => {
                if (ev.data.id !== functionId) { return; }

                worker.removeEventListener("message", initializeFn);
                resolve(ev.data.result);
            });

            worker.postMessage({
                id: functionId,
                ...message,
            });
        })
    }
}
