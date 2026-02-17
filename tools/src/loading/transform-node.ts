import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { AssetContainer } from "@babylonjs/core/assetContainer";

import { isAbstractMesh, isTransformNode } from "../tools/guards";

export function configureTransformNodes(scene: Scene | AssetContainer) {
	const computedMaterials = new Set<Material>();

	scene.transformNodes.forEach((transformNode) => {
		if (transformNode.metadata?.isStaticGroup) {
			const descendants = transformNode.getDescendants(false);
			descendants.push(transformNode);

			descendants.forEach((node) => {
				if (isAbstractMesh(node) || (isTransformNode(node) && !node.isWorldMatrixFrozen)) {
					node.freezeWorldMatrix();
				}

				if (isAbstractMesh(node)) {
					const material = node.material;
					if (material && !material.isFrozen && !computedMaterials.has(material)) {
						computedMaterials.add(material);

						material.onBindObservable.addOnce(() => {
							material.freeze();
						});
					}
				}
			});
		}
	});
}
