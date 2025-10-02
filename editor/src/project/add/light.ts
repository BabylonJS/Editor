import { DirectionalLight, HemisphericLight, Node, PointLight, SpotLight, Tools, Vector3 } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addPointLight(editor: Editor, parent?: Node) {
	const light = new PointLight("New Point Light", Vector3.Zero(), editor.layout.preview.scene);
	light.position.set(100, 100, 100);
	light.id = Tools.RandomId();
	light.uniqueId = UniqueNumber.Get();
	light.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(light);
	});

	editor.layout.inspector.setEditedObject(light);
	editor.layout.preview.gizmo.setAttachedNode(light);

	return light;
}

export function addDirectionalLight(editor: Editor, parent?: Node) {
	const light = new DirectionalLight("New Directional Light", new Vector3(-1, -2, -1), editor.layout.preview.scene);
	light.position.set(100, 200, 100);
	light.id = Tools.RandomId();
	light.uniqueId = UniqueNumber.Get();
	light.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(light);
	});

	editor.layout.inspector.setEditedObject(light);
	editor.layout.preview.gizmo.setAttachedNode(light);

	return light;
}

export function addSpotLight(editor: Editor, parent?: Node) {
	const light = new SpotLight("New Spot Light", new Vector3(100, 100, 100), new Vector3(-1, -2, -1), Math.PI * 0.5, Math.PI, editor.layout.preview.scene);
	light.id = Tools.RandomId();
	light.uniqueId = UniqueNumber.Get();
	light.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(light);
	});

	editor.layout.inspector.setEditedObject(light);
	editor.layout.preview.gizmo.setAttachedNode(light);

	return light;
}

export function addHemisphericLight(editor: Editor, parent?: Node) {
	const light = new HemisphericLight("New Hemispheric Light", new Vector3(-1, -2, -1), editor.layout.preview.scene);
	light.id = Tools.RandomId();
	light.uniqueId = UniqueNumber.Get();
	light.parent = parent ?? null;

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(light);
	});

	editor.layout.inspector.setEditedObject(light);
	editor.layout.preview.gizmo.setAttachedNode(light);

	return light;
}
