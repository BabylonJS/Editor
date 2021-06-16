import { join } from "path";

import { Editor } from "../../../../editor";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserMoveHandler } from "./move-handler";

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
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		from = from.replace(join(WorkSpace.DirPath!, "/"), "");
		to = to.replace(join(WorkSpace.DirPath!, "/"), "");

		const scriptableObjects: { metadata: any }[] = [
			this._editor.scene!,
			...this._editor.scene!.meshes,
			...this._editor.scene!.lights,
			...this._editor.scene!.cameras,
			...this._editor.scene!.transformNodes,
		];

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
}
