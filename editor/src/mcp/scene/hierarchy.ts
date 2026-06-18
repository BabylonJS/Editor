import { Scene, Node } from "babylonjs";

/**
 * Returns the hierarchy of the scene nodes as a tree.
 * Each node is described by its id, name, type (class name) and its children.
 * @param scene defines the reference to the scene to get the hierarchy from.
 * @param rootNodeName defines the optional name of the root node to start from.
 */
export function getSceneHierarchy(scene: Scene, rootNodeName?: string): any {
	let nodes: Node[] = [];
	if (rootNodeName) {
		const rootNode = scene.getNodeByName(rootNodeName);
		if (rootNode) {
			nodes = [rootNode];
		}
	}

	if (!nodes.length) {
		nodes = scene.rootNodes;
	}

	function recurse(root: Node): any {
		const result = {
			id: root.id,
			name: root.name,
			type: root.getClassName(),
			children: [] as any,
		};

		const descendants = root.getDescendants(true);
		for (const descendant of descendants) {
			result.children.push(recurse(descendant));
		}

		return result;
	}

	return nodes.map((node) => recurse(node));
}
