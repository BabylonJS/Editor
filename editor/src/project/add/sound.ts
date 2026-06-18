import { Node } from "babylonjs";

import { Editor } from "../../editor/main";

import { SoundNode } from "../../editor/nodes/sound";

export function addSoundNode(editor: Editor, parent?: Node) {
	const node = new SoundNode("New Sound Node", editor.layout.preview.scene);
	node.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(node);
	});

	editor.layout.inspector.setEditedObject(node);
	editor.layout.preview.gizmo.setAttachedObject(node);

	return node;
}
