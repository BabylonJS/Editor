import { join } from "path";

import { Tools } from "../tools/tools";

/**
 * Defines the type used to describe any constructor of any class.
 */
export type AnyConstructor = (new (...args: any) => any);

/**
 * Defines the type that describes the list of functions of T
 * where T should be a class.
 */
export type FunctionPropertyNames<T> = {
	[K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * In workers, called functions can be synchronous or asynchronous. This type
 * is used to the the return type of the function in the worker by removing the
 * promise type if asynchronous function.
 */
export type Awaitable<T> = T extends PromiseLike<infer U> ? U : T;

export interface IWorkerConfiguration {
	/**
	 * Defines the reference to the effective worker.
	 */
	worker: Worker;
}

export class Workers {
	/**
	 * Defines the reference to the list of all loaded workers.
	 */
	public static Workers: IWorkerConfiguration[] = [];

	/**
	 * Loads a new Worker requiring the given JS path.
	 * @param jsPath defines the path of the JS file to load relative to the "workers" folder.
	 * @param parameters defines the parameters to pass to the constructor of the worker's loaded class.
	 * @returns the reference to the worker configuration.
	 */
	public static async LoadWorker<TClass extends AnyConstructor>(jsPath: string, ...parameters: ConstructorParameters<TClass>): Promise<IWorkerConfiguration> {
		const worker = await this._LoadWorker();
		await this._Execute(worker, "require", {
			parameters,
			path: join(__dirname, "workers", jsPath),
		});

		return worker;
	}

	/**
	 * Executes the given function (fnName) in the worker's required class.
	 * @param config defines the reference to the worker configuration previsouly loaded.
	 * @param fnName defines the name of the function to execute in the main class.
	 * @param parameters defines the parameters to send to the function called in the worker.
	 * @returns the result of the function computed in the worker's context.
	 */
	public static ExecuteFunction<TClass extends Record<any, any>, TFunction extends FunctionPropertyNames<TClass>>(
		config: IWorkerConfiguration,
		fnName: TFunction,
		...parameters: Parameters<TClass[TFunction]>
	): Promise<Awaitable<ReturnType<TClass[TFunction]>>> {
		return this._Execute(config, "executeFunction", {
			fnName,
			parameters,
		});
	}

	/**
	 * Executes the given function (fnName) in the worker's required class.
	 */
	private static _Execute<T>(config: IWorkerConfiguration, messageId: string, data: any): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const randomId = Tools.RandomId();

			let responseFn: (this: Worker, ev: MessageEvent) => any;
			config.worker.addEventListener("message", responseFn = (ev) => {
				if (ev.data?.messageId !== messageId || ev.data.randomId !== randomId) {
					return;
				}

				if (ev.data.error) {
					return reject(new Error(ev.data.error));
				}

				config.worker.removeEventListener("message", responseFn);
				resolve(ev.data.result);
			});

			const transferable = data.parameters.filter((p) => p instanceof OffscreenCanvas);
			config.worker.postMessage({
				...data,
				randomId,
				messageId,
			}, transferable);
		});
	}

	/**
	 * Loads the given JS file path and waits until the worker tells it
	 * has been initialized.
	 */
	private static _LoadWorker(): Promise<IWorkerConfiguration> {
		return new Promise<IWorkerConfiguration>((resolve) => {
			const worker = new Worker(join(__dirname, "base-worker.js"));

			let initializeFn: (this: Worker, ev: MessageEvent) => any;
			worker.addEventListener("message", initializeFn = (ev) => {
				if (ev.data !== "initialized") {
					return;
				}

				const result = {
					worker,
				} as IWorkerConfiguration;
				this.Workers.push(result);

				worker.removeEventListener("message", initializeFn);

				resolve(result);
			});
		});
	}
}
