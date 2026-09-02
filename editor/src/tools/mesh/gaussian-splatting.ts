import { GaussianSplattingMesh, GetGaussianSplattingMaxPartCount, GaussianSplattingCompoundMesh, GaussianSplattingPartProxyMesh } from "babylonjs";

import { Editor } from "../../editor/main";
import { configureImportedNodeIds } from "../../editor/layout/preview/import/import";

import { setNodeSerializable, setNodeVisibleInGraph } from "../node/metadata";

export function configureGaussianSplattingMeshFromData(gaussianSplattingMesh: GaussianSplattingPartProxyMesh, data: any) {
	gaussianSplattingMesh.name = data.name;
	gaussianSplattingMesh.id = data.id;
	gaussianSplattingMesh.uniqueId = data.uniqueId;

	gaussianSplattingMesh.metadata = data.metadata ?? {};
	gaussianSplattingMesh.metadata._waitingParentId = data.metadata?.parentId;

	gaussianSplattingMesh.setEnabled(data.isEnabled ?? true);

	if (data.position) {
		gaussianSplattingMesh.position.copyFromFloats(data.position[0], data.position[1], data.position[2]);
	}
	if (data.rotation) {
		gaussianSplattingMesh.rotation.copyFromFloats(data.rotation[0], data.rotation[1], data.rotation[2]);
	}
	if (data.rotationQuaternion) {
		gaussianSplattingMesh.rotationQuaternion?.copyFromFloats(data.rotationQuaternion[0], data.rotationQuaternion[1], data.rotationQuaternion[2], data.rotationQuaternion[3]);
	}
	if (data.scaling) {
		gaussianSplattingMesh.scaling.copyFromFloats(data.scaling[0], data.scaling[1], data.scaling[2]);
	}
}

export function addGaussianSplattingMeshPartProxyMesh(mesh: GaussianSplattingMesh, editor: Editor) {
	const scene = editor.layout.preview.scene;
	const maxGaussianSplattingPartCount = GetGaussianSplattingMaxPartCount(scene.getEngine());

	let gaussianSplattingCompoundMesh = editor.layout.preview.gaussianSplattingCompoundMesh;
	if (!gaussianSplattingCompoundMesh) {
		gaussianSplattingCompoundMesh = new GaussianSplattingCompoundMesh("GaussianSplattingCompoundMesh", undefined, scene, true);
		configureImportedNodeIds(gaussianSplattingCompoundMesh);

		setNodeSerializable(gaussianSplattingCompoundMesh, false);
		setNodeVisibleInGraph(gaussianSplattingCompoundMesh, false);

		editor.layout.preview.gaussianSplattingCompoundMesh = gaussianSplattingCompoundMesh;
	}

	if (gaussianSplattingCompoundMesh.partCount < maxGaussianSplattingPartCount) {
		const proxyMesh = gaussianSplattingCompoundMesh.addPart(mesh);
		proxyMesh.baseGaussianSplattingMesh = mesh;

		return proxyMesh;
	}
}
