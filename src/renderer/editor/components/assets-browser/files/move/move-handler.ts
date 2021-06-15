export abstract class AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public abstract extensions: string[];

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public abstract moveFile(from: string, to: string): void | Promise<void>;
}
