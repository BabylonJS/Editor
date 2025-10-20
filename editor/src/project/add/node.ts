import { Node, Tools, TransformNode } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addTransformNode(editor: Editor, parent?: Node) {
	const transformNode = new TransformNode("New Transform Node", editor.layout.preview.scene);
	transformNode.id = Tools.RandomId();
	transformNode.uniqueId = UniqueNumber.Get();
	transformNode.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(transformNode);
	});

	editor.layout.inspector.setEditedObject(transformNode);
	editor.layout.preview.gizmo.setAttachedObject(transformNode);
}
