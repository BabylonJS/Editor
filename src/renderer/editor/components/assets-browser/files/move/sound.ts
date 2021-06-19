import { join } from "path";

import { Editor } from "../../../../editor";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserSoundMoveHandler extends AssetsBrowserMoveHandler {
	/**
	 * Defines the list of all extensions handled by the item mover.
	 */
	public extensions: string[] = [
		".mp3", ".wav", ".wave", ".ogg",
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
	 * Called on the user moves the given file from the previous path to the new path.
	 * @param from defines the previous absolute path to the file being moved.
	 * @param to defines the new absolute path to the file being moved.
	 */
	public async moveFile(from: string, to: string): Promise<void> {
        const sounds = this._editor.scene!.mainSoundTrack.soundCollection;

        sounds.forEach((s) => {
            const path = join(this._editor.assetsBrowser.assetsDirectory, s.name);
            if (path === from) {
                s.name = to.replace(join(this._editor.assetsBrowser.assetsDirectory, "/"), "");
            }
        });
	}
}
