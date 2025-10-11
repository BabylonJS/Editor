import { readJSON } from "fs-extra";

import { ISpriteJSONAtlas } from "babylonjs";

import { Editor } from "../../../main";

import { addSpriteMapNode } from "../../../../project/add/sprite";

export async function importJsonFile(editor: Editor, absolutePath: string): Promise<void> {
	const data = await readJSON(absolutePath);
	if (data?.frames && typeof data.meta.image === "string") {
		return importSpriteMap(editor, absolutePath, data);
	}
}

export async function importSpriteMap(editor: Editor, absolutePath: string, atlasJson: ISpriteJSONAtlas): Promise<void> {
	const node = addSpriteMapNode(editor);
	await node.buildFromAbsolutePath(absolutePath, atlasJson);

	editor.layout.graph.refresh();
	editor.layout.inspector.setEditedObject(node);
}
