import { GaussianSplattingMesh } from "babylonjs";

import { isGaussianSplattingMesh } from "../guards/nodes";

export function configureGaussianSplattingMeshFromData(gaussianSplattingMesh: GaussianSplattingMesh, data: any) {
	gaussianSplattingMesh.name = data.name;
	gaussianSplattingMesh.id = data.id;
	gaussianSplattingMesh.uniqueId = data.uniqueId;

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

export function removeGaussianSplattingCameraMeshes(gaussianSplattingMesh: GaussianSplattingMesh) {
	gaussianSplattingMesh.material?.getBindedMeshes().forEach((gaussianMesh) => {
		if (!isGaussianSplattingMesh(gaussianMesh)) {
			gaussianSplattingMesh.getScene().removeMesh(gaussianMesh);
		}
	});
}
