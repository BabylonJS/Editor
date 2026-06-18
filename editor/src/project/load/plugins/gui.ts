import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Editor } from "../../../editor/main";
import { applyImportedGuiFile } from "../../../editor/layout/preview/import/gui";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadGuis(editor: Editor, guiFiles: string[], options: ISceneLoaderPluginOptions) {
	await Promise.all(
		guiFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "gui", file), "utf-8");

				const gui = await applyImportedGuiFile(editor, join(options.projectPath, "assets", data.relativePath));

				if (gui) {
					gui.name = data.name;
					return gui;
				}
			} catch (e) {
				editor.layout.console.error(`Failed to load GUI file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);
}
