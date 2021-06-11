import { Nullable } from "../shared/types";

export class Settings {
	/**
	 * The path to the opened file from the OS file explorer
	 */
	public static OpenedFile: Nullable<string> = null;
	/**
	 * The path to the folder containing the workspace file.
	 */
	public static WorkspacePath: Nullable<string> = null;
}
