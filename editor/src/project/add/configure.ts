import { AbstractMesh, Tools, Node } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";
import { isGaussianSplattingMesh } from "../../tools/guards/nodes";

import { Editor } from "../../editor/main";

export function configureAddedMesh(editor: Editor, mesh: AbstractMesh, parent?: Node) {
	// Gaussian splatting meshes render through thin instances and can't be drawn by the shadow/depth pass,
	// so they neither receive shadows nor go into shadow-map render lists.
	const isGaussianSplatting = isGaussianSplattingMesh(mesh);

	mesh.receiveShadows = !isGaussianSplatting;
	mesh.id = Tools.RandomId();
	mesh.uniqueId = UniqueNumber.Get();
	mesh.parent = parent ?? null;

	if (mesh.geometry && !isGaussianSplatting) {
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
	editor.layout.preview.gizmo.setAttachedObject(mesh);

	return mesh;
}
