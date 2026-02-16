import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";

import { isAbstractMesh, isTransformNode } from "../tools/guards";

export function configureTransformNodes(scene: Scene | AssetContainer) {
	scene.transformNodes.forEach((transformNode) => {
		if (transformNode.metadata?.isStaticGroup) {
			const descendants = transformNode.getDescendants(false);
			descendants.push(transformNode);

			descendants.forEach((node) => {
				if (isAbstractMesh(node) || (isTransformNode(node) && !node.isWorldMatrixFrozen)) {
					node.freezeWorldMatrix();
				}

				if (isAbstractMesh(node) && node.material && !node.material.isFrozen) {
					node.material.freeze();
				}
			});
		}
	});
}
