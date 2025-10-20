import { Node, Tools } from "babylonjs";

import { Editor } from "../../editor/main";

import { SpriteMapNode } from "../../editor/nodes/sprite-map";
import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";

export function addSpriteManager(editor: Editor, parent?: Node) {
	const node = new SpriteManagerNode("New Sprite Manager Node", editor.layout.preview.scene);
	node.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(node);
	});

	editor.layout.inspector.setEditedObject(node);
	editor.layout.preview.gizmo.setAttachedObject(node);

	return node;
}

export function addSpriteMapNode(editor: Editor, parent?: Node) {
	const node = new SpriteMapNode("New Sprite Map Node", editor.layout.preview.scene);
	node.parent = parent ?? null;

	node.tiles = [
		{
			id: Tools.RandomId(),
			name: "Default",
			layer: 0,
			position: { x: 0, y: 0 },
			repeatCount: { x: 0, y: 0 },
			repeatOffset: { x: 0, y: 0 },
			tile: 1,
		},
	];

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(node);
	});

	editor.layout.inspector.setEditedObject(node);
	editor.layout.preview.gizmo.setAttachedObject(node);

	return node;
}
