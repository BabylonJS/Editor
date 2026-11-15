import { ipcRenderer } from "electron";
import { join, dirname } from "path/posix";

import { isSceneLinkNode } from "../../../../tools/guards/scene";

import { projectConfiguration } from "../../../../project/configuration";

import { checkProjectCachedCompressedTextures } from "../../../../tools/assets/ktx";

import { Editor } from "../../../main";

export function listenSceneAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", (_, type, data) => {
		if (type !== "scene" || !projectConfiguration.path) {
			return;
		}

		reloadSceneLinks(editor, data);
	});
}

/**
 * Reloads every link of the current scene to the given scene.
 * @param editor defines the reference to the editor.
 * @param absolutePath defines the absolute path of the linked scene (.scene).
 * @returns the number of scene links reloaded.
 */
export async function reloadSceneLinks(editor: Editor, absolutePath: string): Promise<number> {
	if (!projectConfiguration.path) {
		return 0;
	}

	const relativePath = absolutePath.replace(join(dirname(projectConfiguration.path), "/"), "");
	const sceneLinks = editor.layout.preview.scene.transformNodes.filter((transformNode) => isSceneLinkNode(transformNode) && transformNode.relativePath === relativePath);

	await Promise.all(
		sceneLinks.map(async (sceneLink) => {
			if (isSceneLinkNode(sceneLink)) {
				await sceneLink.reload();
			}
		})
	);

	checkProjectCachedCompressedTextures(editor);
	editor.layout.preview.setRenderScene(true);

	return sceneLinks.length;
}
