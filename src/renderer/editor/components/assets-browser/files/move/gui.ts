import { join } from "path";

import { Editor } from "../../../../editor";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserGUIMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [".gui"];

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
		const relativePath = path.replace(join(WorkSpace.DirPath!, "/assets/"), "");
        return (this._editor.scene!.meshes.find((m) => m.metadata?.guiPath === relativePath) ?? null) !== null;
	}

	/**
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
		const relativeTo = to.replace(join(WorkSpace.DirPath!, "assets/"), "");
		const relativeFrom = from.replace(join(WorkSpace.DirPath!, "assets/"), "");

        this._editor.scene!.meshes.forEach((m) => {
            if (m.metadata?.guiPath === relativeFrom) {
                m.metadata.guiPath = relativeTo;
            }
        })
	}
}
