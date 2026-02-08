import { ScriptConfig } from "./loading/script/config";

/**
 * Defines the interface that can be implemented by scripts attached to nodes in the editor.
 */
export interface IScript {
	/**
	 * Optional configuration object that can be used to configure the script.
	 */
	config?: ScriptConfig;

	/**
	 * Method called when the script starts. This method is called only once.
	 */
	onStart?(object: any): void;

	/**
	 * Method called on each frame.
	 */
	onUpdate?(object: any): void;

	/**
	 * Method called on the script is stopped or the object is disposed.
	 */
	onStop?(object: any): void;
}
