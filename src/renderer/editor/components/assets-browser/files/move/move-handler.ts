export abstract class AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public abstract extensions: string[];

	/**
	 * Returns wether or not the asset located at the given path is used in the project.
	 * @param path defines the absolute path to the file.
	 */
	public abstract isFileUsed(path: string): Promise<boolean>;

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public abstract moveFile(from: string, to: string): void | Promise<void>;

	/**
	 * Returns wheter or not the given file can be renamed.
	 * @param from defines the previous absolute path to the file being renamed.
	 * @param to defines the new absolute path to the file being renamed.
	 */
	public async canRename(_from: string, _to: string): Promise<boolean> {
		return true;
	}

	/**
	 * Called on the given file is being remvoed.
	 * @param path defines the absolute path to the file that is being removed.
	 */
	public async onRemoveFile(_: string): Promise<void> {
		// Nothing to do for now...
	}
}
