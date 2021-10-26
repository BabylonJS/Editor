import { join } from "path";
import { readdir, readJSON } from "fs-extra";

import { Editor } from "../../../../editor";

import { Project } from "../../../../project/project";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserMeshMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [
		".fbx",
		".gltf", ".glb",
		".babylon",
		".obj", ".stl",
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
		return this._editor.scene!.meshes.find((m) => m.metadata?.originalSourceFile?.sceneFileName === relativePath) ? true : false;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		const meshes = this._editor.scene!.meshes;

		meshes.forEach((m) => {
			const originalSourceFile = m.metadata?.originalSourceFile;
			if (!originalSourceFile?.sceneFileName) {
				return;
			}

			const path = join(this._editor.assetsBrowser.assetsDirectory, originalSourceFile.sceneFileName);
			if (path === from) {
				originalSourceFile.sceneFileName = to.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");
			}
		});

		const meshesDir = join(Project.DirPath!, "meshes");
		const meshesFiles = await readdir(meshesDir);

		await Promise.all(meshesFiles.map(async (mf) => {
			try {
				const json = await readJSON(join(meshesDir, mf));
				json.meshes?.forEach((m) => {
					const originalSourceFile = m.metadata?.originalSourceFile;
					if (!originalSourceFile?.sceneFileName) {
						return;
					}

					const path = join(this._editor.assetsBrowser.assetsDirectory, originalSourceFile.sceneFileName);
					if (path === from) {
						originalSourceFile.sceneFileName = to.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");
					}
				});
			} catch (e) {
				this._editor.console.logError(`Failed to link moved mesh ("${from}") for mesh "${mf}"`);
			}
		}));
	}
}
