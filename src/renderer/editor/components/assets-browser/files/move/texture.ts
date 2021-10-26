import { join } from "path";

import { Texture } from "babylonjs";

import { Editor } from "../../../../editor";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserTextureMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [
		".png", ".jpg", ".jpeg", ".bmp",
		".env", ".dds", ".basis",
	];

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
		const relativePath = path.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");
		return this._editor.scene!.textures.find((t) => t.name === relativePath) ? true : false;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		const textures = this._editor.scene!.textures;

		textures.forEach((tex) => {
			const path = join(this._editor.assetsBrowser.assetsDirectory, tex.name);
			if (path === from) {
				tex.name = to.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");
				if (tex instanceof Texture) {
					tex.url = tex.name;
				}
			}
		});
	}
}
