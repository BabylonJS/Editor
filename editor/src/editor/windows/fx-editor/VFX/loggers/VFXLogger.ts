import { Logger } from "babylonjs";
import type { VFXLoaderOptions } from "../types";

/**
 * Logger utility for VFX operations
 */
export class VFXLogger {
	private _prefix: string;
	private _options?: VFXLoaderOptions;

	constructor(prefix: string = "[VFX]", options?: VFXLoaderOptions) {
		this._prefix = prefix;
		this._options = options;
	}

	/**
	 * Log a message if verbose mode is enabled
	 */
	public log(message: string): void {
		if (this._options?.verbose) {
			Logger.Log(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log a warning if verbose or validate mode is enabled
	 */
	public warn(message: string): void {
		if (this._options?.verbose || this._options?.validate) {
			Logger.Warn(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log an error
	 */
	public error(message: string): void {
		Logger.Error(`${this._prefix} ${message}`);
	}
}
