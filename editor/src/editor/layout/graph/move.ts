import { TransformNode, AbstractMesh, Vector3, Node } from "babylonjs";

import { isScene } from "../../../tools/guards/scene";
import { isSound } from "../../../tools/guards/sound";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isClusteredLight } from "../../../tools/light/cluster";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isAbstractMesh, isClusteredLightContainer, isInstancedMesh, isLight, isMesh, isNode, isTransformNode } from "../../../tools/guards/nodes";
import { applyNodeParentingConfiguration, applyTransformNodeParentingConfiguration, IOldNodeHierarchyConfiguration } from "../../../tools/node/parenting";

import { Editor } from "../../main";

export function setNewParentForGraphSelectedNodes(editor: Editor, newParent: any, shift: boolean) {
	const nodesToMove = editor.layout.graph.getSelectedNodes();
	const oldHierarchyMap = new Map<unknown, unknown>();
	const clusteredLightContainer = editor.layout.preview.clusteredLightContainer;

	nodesToMove.forEach((n) => {
		if (n.nodeData && n.nodeData !== newParent) {
			if (isLight(n.nodeData) && isClusteredLight(n.nodeData, editor)) {
				return oldHierarchyMap.set(n.nodeData, clusteredLightContainer);
			}

			if (isNode(n.nodeData)) {
				if (isClusteredLightContainer(newParent)) {
					if (!isLight(n.nodeData) || isClusteredLight(n.nodeData, editor)) {
						return;
					}

					return oldHierarchyMap.set(n.nodeData, n.nodeData.parent);
				} else if (n.nodeData.parent !== newParent) {
					const descendants = n.nodeData.getDescendants(false);
					if (descendants.includes(newParent)) {
						return;
					}

					return oldHierarchyMap.set(n.nodeData, {
						parent: n.nodeData.parent,
						position: n.nodeData["position"]?.clone(),
						rotation: n.nodeData["rotation"]?.clone(),
						scaling: n.nodeData["scaling"]?.clone(),
						rotationQuaternion: n.nodeData["rotationQuaternion"]?.clone(),
					} as IOldNodeHierarchyConfiguration);
				}
			}

			if (isSound(n.nodeData)) {
				return oldHierarchyMap.set(n.nodeData, n.nodeData["_connectedTransformNode"]);
			}

			if (isAnyParticleSystem(n.nodeData)) {
				return oldHierarchyMap.set(n.nodeData, n.nodeData.emitter);
			}
		}
	});

	if (!oldHierarchyMap.size) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			nodesToMove.forEach((n) => {
				if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
					if (isLight(n.nodeData)) {
						if (isClusteredLight(n.nodeData, editor)) {
							clusteredLightContainer.removeLight(n.nodeData);
							return (n.nodeData.parent = oldHierarchyMap.get(n.nodeData) as Node | null);
						}

						const oldParent = oldHierarchyMap.get(n.nodeData) as Node | null;
						if (isClusteredLightContainer(oldParent)) {
							return oldParent.addLight(n.nodeData);
						}
					}

					if (isNode(n.nodeData)) {
						return applyNodeParentingConfiguration(n.nodeData, oldHierarchyMap.get(n.nodeData) as IOldNodeHierarchyConfiguration);
					}

					if (isSound(n.nodeData)) {
						const oldSoundNode = oldHierarchyMap.get(n.nodeData);

						if (oldSoundNode) {
							return n.nodeData.attachToMesh(oldSoundNode as TransformNode);
						}

						n.nodeData.detachFromMesh();
						n.nodeData.spatialSound = false;
						n.nodeData.setPosition(Vector3.Zero());
						return (n.nodeData["_connectedTransformNode"] = null);
					}

					if (isAnyParticleSystem(n.nodeData)) {
						return (n.nodeData.emitter = oldHierarchyMap.get(n.nodeData) as AbstractMesh);
					}
				}
			});
		},
		redo: () => {
			const tempTransfromNode = new TransformNode("tempParent", editor.layout.preview.scene);

			try {
				nodesToMove.forEach((n) => {
					if (n.nodeData === newParent) {
						return;
					}

					if (n.nodeData && oldHierarchyMap.has(n.nodeData)) {
						if (isNode(n.nodeData)) {
							if (isLight(n.nodeData)) {
								if (isClusteredLightContainer(newParent)) {
									return newParent.addLight(n.nodeData);
								}

								if (isClusteredLight(n.nodeData, editor)) {
									clusteredLightContainer.removeLight(n.nodeData);
									return (n.nodeData.parent = isScene(newParent) ? null : newParent);
								}
							}

							if (shift) {
								return applyTransformNodeParentingConfiguration(n.nodeData, newParent, tempTransfromNode);
							}

							return (n.nodeData.parent = isScene(newParent) ? null : newParent);
						}

						if (isSound(n.nodeData)) {
							if (isTransformNode(newParent) || isMesh(newParent) || isInstancedMesh(newParent)) {
								return n.nodeData.attachToMesh(newParent);
							}

							if (isScene(newParent)) {
								n.nodeData.detachFromMesh();
								n.nodeData.spatialSound = false;
								n.nodeData.setPosition(Vector3.Zero());
								return (n.nodeData["_connectedTransformNode"] = null);
							}
						}

						if (isAnyParticleSystem(n.nodeData)) {
							if (isAbstractMesh(newParent)) {
								return (n.nodeData.emitter = newParent);
							}
						}
					}
				});
			} catch (e) {
				console.error(e);
			}

			tempTransfromNode.dispose(false, true);
		},
	});

	editor.layout.graph.refresh();
}
