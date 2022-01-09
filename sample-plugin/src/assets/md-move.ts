import { Editor, AssetsBrowserMoveHandler } from "babylonjs-editor";

export class AssetsBrowserMarkdownMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [".md"];

	private _editor: Editor;

	/**
	 * Constructor.
	 * @param editor defines the reference to the editor.
	 */
	public constructor(editor: Editor) {
		super();

		this._editor = editor;
	}

	/**
	 * Returns wether or not the asset located at the given path is used in the project.
	 * @param path defines the absolute path to the file.
	 */
	public async isFileUsed(path: string): Promise<boolean> {
		console.log(`Checking wether file "${path}" is used in the project.`);
		return false;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		console.log(`Moving file "${from}" to "${to}"`, this._editor);
	}
}
