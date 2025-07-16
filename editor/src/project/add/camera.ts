import { ArcRotateCamera, FreeCamera, Tools, Vector3 } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function addFreeCamera(editor: Editor) {
	const camera = new FreeCamera("New Free Camera", Vector3.Zero(), editor.layout.preview.scene);
	camera.position.copyFrom(editor.layout.preview.camera.position);
	camera.setTarget(editor.layout.preview.camera.getTarget());
	camera.id = Tools.RandomId();
	camera.uniqueId = UniqueNumber.Get();

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(camera);
	});

	editor.layout.inspector.setEditedObject(camera);
	editor.layout.preview.gizmo.setAttachedNode(camera);
}

export function addArcRotateCamera(editor: Editor) {
	const camera = new ArcRotateCamera("New Arc-Rotate Camera", 0, 0, 10, Vector3.Zero(), editor.layout.preview.scene);
	camera.position.copyFrom(editor.layout.preview.camera.position);
	camera.setTarget(editor.layout.preview.camera.getTarget());
	camera.id = Tools.RandomId();
	camera.uniqueId = UniqueNumber.Get();

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(camera);
	});

	editor.layout.inspector.setEditedObject(camera);
	editor.layout.preview.gizmo.setAttachedNode(camera);
}
