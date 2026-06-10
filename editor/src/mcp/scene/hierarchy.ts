import { Scene, Node } from "babylonjs";

export function getSceneHierarchy(scene: Scene, rootNodeName?: string) {
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

	function recurse(root: Node) {
		const result = {
			id: root.id,
			name: root.name,
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
