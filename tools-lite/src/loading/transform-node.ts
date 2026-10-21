import { SceneContext } from "@babylonjs/lite";

import { getSceneData } from "../tools/scene";

const staticNodes = new WeakSet<object>();

/**
 * Returns wether or not the given node belongs to a static group configured in the editor.
 * @param node defines the reference to the node.
 */
export function isNodeInStaticGroup(node: object): boolean {
	return staticNodes.has(node);
}

/**
 * Configures the nodes of the static groups created in the editor (transform nodes with `metadata.isStaticGroup`).
 * Babylon.js freezes the world matrices and the materials of the static groups to save CPU time. Babylon Lite computes
 * the world matrices only when the transforms change and builds the materials once: there is nothing to freeze, the
 * nodes of the static groups are only marked as static (see `isNodeInStaticGroup`).
 * @param scene defines the reference to the scene to configure.
 */
export function configureTransformNodes(scene: SceneContext) {
	const data = getSceneData(scene);
	const nodes = [...data.transformNodes, ...data.meshes];

	nodes.forEach((transformNode) => {
		if (!transformNode.metadata?.isStaticGroup) {
			return;
		}

		const traverse = (node: any) => {
			staticNodes.add(node);
			node.children?.forEach((child: any) => traverse(child));
		};

		traverse(transformNode);
	});
}
