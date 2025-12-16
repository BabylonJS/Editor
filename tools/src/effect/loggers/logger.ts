import { Logger as BabylonLogger } from "babylonjs";
import type { ILoaderOptions } from "../types";

/**
 * Logger utility for  operations
 */
export class Logger {
	private _prefix: string;
	private _options?: ILoaderOptions;

	constructor(prefix: string = "[]", options?: ILoaderOptions) {
		this._prefix = prefix;
		this._options = options;
	}

	/**
	 * Log a message if verbose mode is enabled
	 */
	public log(message: string): void {
		if (this._options?.verbose) {
			BabylonLogger.Log(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log a warning if verbose or validate mode is enabled
	 */
	public warn(message: string): void {
		if (this._options?.verbose || this._options?.validate) {
			BabylonLogger.Warn(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log an error
	 */
	public error(message: string): void {
		BabylonLogger.Error(`${this._prefix} ${message}`);
	}
}
