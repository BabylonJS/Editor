import { TransformNode, AbstractMesh, Node } from "babylonjs";

import { isScene } from "../../../tools/guards/scene";
import { registerUndoRedo } from "../../../tools/undoredo";
import { isClusteredLight } from "../../../tools/light/cluster";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isAbstractMesh, isClusteredLightContainer, isLight, isNode } from "../../../tools/guards/nodes";
import { applyNodeParentingConfiguration, applyTransformNodeParentingConfiguration, IOldNodeHierarchyConfiguration } from "../../../tools/node/parenting";

import { Editor } from "../../main";

export function setNewParentForGraphSelectedNodes(editor: Editor, newParent: any, shift: boolean) {
	setNewParentForObjects(
		editor,
		editor.layout.graph.getSelectedNodes().map((n) => n.nodeData),
		newParent,
		shift
	);
}

/**
 * Sets the new parent of the given objects of the graph with undo/redo support.
 * @param editor defines the reference to the editor used to refresh the graph.
 * @param objects defines the objects of the graph to move (nodes and particle systems).
 * @param newParent defines the new parent of the objects: a node, the clustered light container or the scene.
 * @param shift defines wether or not the objects should keep their world transform.
 */
export function setNewParentForObjects(editor: Editor, objects: unknown[], newParent: any, shift: boolean) {
	const oldHierarchyMap = new Map<unknown, unknown>();
	const nodesToMove = objects.map((nodeData) => ({ nodeData }));
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
