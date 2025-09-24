import { AbstractMesh, Tools, Node } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { Editor } from "../../editor/main";

export function configureAddedMesh(editor: Editor, mesh: AbstractMesh, parent?: Node) {
	mesh.receiveShadows = true;
	mesh.id = Tools.RandomId();
	mesh.uniqueId = UniqueNumber.Get();
	mesh.parent = parent ?? null;

	if (mesh.geometry) {
		mesh.geometry.id = Tools.RandomId();
		mesh.geometry.uniqueId = UniqueNumber.Get();

		editor.layout.preview.scene.lights.forEach((light) => {
			light.getShadowGenerator()?.getShadowMap()?.renderList?.push(mesh);
		});
	}

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(mesh);
	});

	editor.layout.inspector.setEditedObject(mesh);
	editor.layout.preview.gizmo.setAttachedNode(mesh);

	return mesh;
}
