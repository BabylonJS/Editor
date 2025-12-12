import { Logger } from "babylonjs";
import type { VFXLoaderOptions } from "../types";

/**
 * Logger utility for VFX operations
 */
export class VFXLogger {
	private _prefix: string;

	constructor(prefix: string = "[VFX]") {
		this._prefix = prefix;
	}

	/**
	 * Log a message if verbose mode is enabled
	 */
	public log(message: string, options?: VFXLoaderOptions): void {
		if (options?.verbose) {
			Logger.Log(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log a warning if verbose or validate mode is enabled
	 */
	public warn(message: string, options?: VFXLoaderOptions): void {
		if (options?.verbose || options?.validate) {
			Logger.Warn(`${this._prefix} ${message}`);
		}
	}

	/**
	 * Log an error
	 */
	public error(message: string, _options?: VFXLoaderOptions): void {
		Logger.Error(`${this._prefix} ${message}`);
	}
}
