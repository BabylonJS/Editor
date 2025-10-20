import { Node, Tools, Sprite } from "babylonjs";

import { Editor } from "../../editor/main";

import { SpriteMapNode } from "../../editor/nodes/sprite-map";
import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";

import { configureImportedMaterial, configureImportedNodeIds, configureImportedTexture } from "../../editor/layout/preview/import/import";

import { getProjectAssetsRootUrl } from "../../project/configuration";

import { UniqueNumber } from "../tools";

import { cloneSprite } from "../sprite/tools";

import { isTexture } from "../guards/texture";
import { isSprite, isSpriteManagerNode, isSpriteMapNode } from "../guards/sprites";
import { isCamera, isInstancedMesh, isLight, isMesh, isNode, isTransformNode } from "../guards/nodes";

import { isNodeVisibleInGraph } from "./metadata";

export interface ICloneNodeOptions {
	shareGeometry?: boolean;
	shareSkeleton?: boolean;
	cloneMaterial?: boolean;
	cloneThinInstances?: boolean;
}

export function cloneNode(editor: Editor, node: Node | Sprite, options?: ICloneNodeOptions) {
	const suffix = "(Clone)";

	let clone: Node | Sprite | null = null;

	defer: {
		if (isMesh(node)) {
			const name = `${node.name.replace(` ${suffix}`, "")} ${suffix}`;
			clone = node.clone(name, {
				parent: node.parent,
				doNotCloneChildren: false,
				clonePhysicsImpostor: true,
				cloneThinInstances: options?.cloneThinInstances ?? true,
			});
			break defer;
		}

		if (isLight(node) || isCamera(node)) {
			const name = `${node.name.replace(` ${suffix}`, "")} ${suffix}`;
			clone = node.clone(name, node.parent);
			break defer;
		}

		if (isTransformNode(node) || isInstancedMesh(node)) {
			const name = `${node.name.replace(` ${suffix}`, "")} ${suffix}`;
			clone = node.clone(name, node.parent, false);
			break defer;
		}

		if (isSprite(node)) {
			clone = cloneSprite(node);
			break defer;
		}

		if (isSpriteManagerNode(node)) {
			const name = `${node.name.replace(` ${suffix}`, "")} ${suffix}`;
			const serializationData = node.serialize();

			clone = SpriteManagerNode.Parse(serializationData, editor.layout.preview.scene, getProjectAssetsRootUrl()!);
			clone.name = name;
			clone.parent = node.parent;

			break defer;
		}

		if (isSpriteMapNode(node)) {
			const name = `${node.name.replace(` ${suffix}`, "")} ${suffix}`;
			const serializationData = node.serialize();

			clone = SpriteMapNode.Parse(serializationData, editor.layout.preview.scene, getProjectAssetsRootUrl()!);
			clone.name = name;
			clone.parent = node.parent;

			break defer;
		}
	}

	if (!clone) {
		return null;
	}

	let descendants = [clone];
	if (isNode(clone)) {
		descendants = [clone, ...clone.getDescendants(false)].filter((n) => {
			if (!isNodeVisibleInGraph(n)) {
				return false;
			}

			return true;
		});

		if (isSpriteManagerNode(clone) && clone.spriteManager) {
			descendants.push(...clone.spriteManager.sprites);
		}
	}

	descendants.forEach((descendant) => {
		if (isMesh(descendant)) {
			if (descendant.material && options?.cloneMaterial) {
				const clonedMaterial = descendant.material.clone(`${descendant.material.name.replace(` ${suffix}`, "")} ${suffix}`);
				if (clonedMaterial) {
					configureImportedMaterial(clonedMaterial);
					clonedMaterial.getActiveTextures().forEach((clonedTexture) => {
						if (isTexture(clonedTexture)) {
							configureImportedTexture(clonedTexture);
						}
					});
					descendant.material = clonedMaterial;
				} else {
					editor.layout.console.warn(`Failed to clone material for the mesh being cloned ${descendant.material.name}`);
				}
			}

			if (descendant.skeleton && !options?.shareSkeleton) {
				const clonedSkeleton = descendant.skeleton.clone(`${descendant.skeleton.name.replace(` ${suffix}`, "")} ${suffix}`);
				clonedSkeleton.id = Tools.RandomId();
				clonedSkeleton["_uniqueId"] = UniqueNumber.Get();
				clonedSkeleton.bones.forEach((bone) => configureImportedNodeIds(bone));
				descendant.skeleton = clonedSkeleton;
			}

			if (!options?.shareGeometry) {
				descendant.makeGeometryUnique();
				if (descendant.geometry) {
					descendant.geometry.id = Tools.RandomId();
					descendant.geometry.uniqueId = UniqueNumber.Get();
				}
			}
		}

		configureImportedNodeIds(descendant);

		if (isNode(descendant)) {
			if (descendant.parent) {
				// Removes the hierarchy prefix from the name. Maybe we should keep it instead of removing it?
				let parent: Node | null = descendant.parent;
				while (parent) {
					descendant.name = descendant.name.replace(`${parent.name}.`, "");
					parent = parent.parent;
				}
			}
		}

		if (descendant.metadata) {
			try {
				descendant.metadata = JSON.parse(JSON.stringify(descendant.metadata));
			} catch (e) {
				editor.layout.console.warn(`Failed to clone metadata for the mesh being cloned ${descendant.name}: ${e.message}`);
			}
		}
	});

	return clone;
}
