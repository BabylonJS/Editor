import { Scene, Node } from "babylonjs";

import { isSceneLinkNode } from "../../tools/guards/scene";
import { isSpriteManagerNode } from "../../tools/guards/sprites";
import { isAdvancedDynamicTexture } from "../../tools/guards/texture";
import { isAbstractMesh, isClusteredLightContainer } from "../../tools/guards/nodes";

import { GraphObject, getGraphObjectId, isNodeInGraph, isParticleSystemInGraph } from "../tools/resolve";

/**
 * Returns the children of the given node as the graph of the editor shows them.
 * @param node defines the reference to the node to get the children from.
 */
function getGraphChildren(node: Node): GraphObject[] {
	// The graph doesn't show the content of a scene link: it belongs to the linked scene.
	if (isSceneLinkNode(node)) {
		return [];
	}

	const children: GraphObject[] = node.getDescendants(true).filter((child) => isNodeInGraph(child));

	if (isAbstractMesh(node)) {
		children.push(...node.getScene().particleSystems.filter((particleSystem) => particleSystem.emitter === node && isParticleSystemInGraph(particleSystem)));
	}

	if (isSpriteManagerNode(node)) {
		children.push(...(node.spriteManager?.sprites ?? []));
	}

	if (isClusteredLightContainer(node)) {
		children.push(...node.lights);
	}

	return children;
}

/**
 * Returns the hierarchy of the scene as a tree, showing what the user sees in the graph of the editor.
 * Each object is described by its id, name, type (class name) and its children.
 * @param scene defines the reference to the scene to get the hierarchy from.
 * @param rootNodeName defines the optional name of the root node to start from.
 */
export function getSceneHierarchy(scene: Scene, rootNodeName?: string): any {
	const rootNode = rootNodeName ? scene.getNodeByName(rootNodeName) : null;

	function recurse(root: GraphObject): any {
		return {
			id: getGraphObjectId(root),
			name: root.name,
			type: root.getClassName(),
			children: root instanceof Node ? getGraphChildren(root).map((child) => recurse(child)) : [],
		};
	}

	if (rootNode) {
		return [recurse(rootNode)];
	}

	return [...scene.rootNodes.filter((node) => isNodeInGraph(node)), ...scene.skeletons, ...scene.textures.filter((texture) => isAdvancedDynamicTexture(texture))].map((object) =>
		recurse(object)
	);
}
