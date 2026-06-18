import { dirname, join } from "path/posix";

import { Scene, Node, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";
import { isScene } from "../../../../tools/guards/scene";

import { projectConfiguration } from "../../../../project/configuration";

import { SoundNode } from "../../../nodes/sound";

import { Editor } from "../../../main";

export async function applySoundAsset(editor: Editor, parent: Scene | Node, absolutePath: string) {
	const relativePath = absolutePath.replace(join(dirname(projectConfiguration.path!), "/"), "");

	const node = new SoundNode(relativePath, editor.layout.preview.scene);
	node.id = Tools.RandomId();
	node.uniqueId = UniqueNumber.Get();

	if (parent) {
		node.parent = isScene(parent) ? null : parent;
	}

	await node.setSoundAbsolutePath(absolutePath);
}
