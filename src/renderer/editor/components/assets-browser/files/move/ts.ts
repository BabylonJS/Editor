import { join } from "path";
import { readJSON, writeJSON } from "fs-extra";

import { Editor } from "../../../../editor";

import { FSTools } from "../../../../tools/fs";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserMoveHandler } from "./move-handler";
import { SceneExporter } from "../../../../project/scene-exporter";

export class AssetsBrowserTypeScriptMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [".ts"];

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
	public async isFileUsed(path: string): Promise<boolean> {
		const relativePath = path.replace(join(WorkSpace.DirPath!, "/"), "");
		return this._getScriptableObjects().find((so) => so.metadata?.script?.name === relativePath) ? true : false;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		this._updateInstantiatedNodes(from, to);

		await this._updateMaterials(from, to);
	}

	/**
	 * Returns the list of all scriptable objects.
	 */
	private _getScriptableObjects(): { metadata: any }[] {
		return [
			this._editor.scene!,
			...this._editor.scene!.meshes,
			...this._editor.scene!.lights,
			...this._editor.scene!.cameras,
			...this._editor.scene!.transformNodes,
		];
	}

	/**
	 * Updates all the instantiated nodes.
	 */
	private _updateInstantiatedNodes(from: string, to: string): void {
		from = from.replace(join(WorkSpace.DirPath!, "/"), "");
		to = to.replace(join(WorkSpace.DirPath!, "/"), "");

		const scriptableObjects = this._getScriptableObjects();
		
		scriptableObjects.forEach((o) => {
			const script = o.metadata?.script;
			if (!script) {
				return;
			}

			if (script.name === from) {
				script.name = to;
			}
		});
	}

	/**
	 * Updates all materials.
	 */
	private async _updateMaterials(from: string, to: string): Promise<void> {
		// Update instantiated
		from = from.replace(join(WorkSpace.DirPath!, "/"), "");
		to = to.replace(join(WorkSpace.DirPath!, "/"), "");

		this._editor.scene!.materials.forEach((m) => {
			if (!m.metadata?.sourcePath) {
				return;
			}

			if (m.metadata.sourcePath === from) {
				m.metadata.sourcePath = to;
			}
		});

		// Update files
		let shouldGenerateScene: boolean = false;

		const files = await FSTools.GetGlobFiles(join(this._editor.assetsBrowser.assetsDirectory, "**", "*.material"));
		await Promise.all(files.map(async (f) => {
			try {
				const json = await readJSON(f, { encoding: "utf-8" });
				if (json.metadata?.sourcePath === from) {
					json.metadata.sourcePath = to;
					await writeJSON(f, json, { encoding: "utf-8" });
					shouldGenerateScene = true;
				}
			} catch (e) {
				this._editor.console.logError(`Failed to update material references while moving "${from}" TS file: ${e.message}`);
			}
		}));

		if (shouldGenerateScene) {
			SceneExporter.ExportFinalScene(this._editor);
		}
	}
}
