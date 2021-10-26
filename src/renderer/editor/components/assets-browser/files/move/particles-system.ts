import { join } from "path";
import { readJSON, writeJSON } from "fs-extra";

import { Editor } from "../../../../editor";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserParticlesSystemMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [".ps"];

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
		return this._editor.scene!.particleSystems.find((ps) => ps["metadata"]?.editorPath === relativePath) ? true : false;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		const particlesSystems = this._editor.scene!.particleSystems;
		const newEditorPath = to.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");

		particlesSystems.forEach((ps) => {
			const editorPath = ps["metadata"]?.editorPath;
			if (!editorPath) {
				return;
			}

			const path = join(this._editor.assetsBrowser.assetsDirectory, editorPath);
			if (path === from) {
				ps["metadata"].editorPath = newEditorPath;
			}
		});

		try {
			const json = await readJSON(from);
			if (json.metadata) {
				json.metadata.editorPath = newEditorPath;
			}

			await writeJSON(from, json, {
				spaces: "\t",
				encoding: "utf-8",
			});
		} catch (e) {
			// Catch silently.
		}
	}
}
