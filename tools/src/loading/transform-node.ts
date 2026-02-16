import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";

import { isAbstractMesh, isTransformNode } from "../tools/guards";

export function configureTransformNodes(scene: Scene | AssetContainer) {
	scene.transformNodes.forEach((transformNode) => {
		if (transformNode.metadata?.isStaticGroup) {
			const descendants = transformNode.getDescendants(false);

			descendants.forEach((node) => {
				if (isAbstractMesh(node) || isTransformNode(node)) {
					if (!node.isWorldMatrixFrozen) {
						node.freezeWorldMatrix();
					}
				}
			});
		}
	});
}
