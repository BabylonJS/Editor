import { FBXReaderNode } from "fbx-parser";

export interface IFBXRelationShip {
	id: number;
	relationship?: string;
}

export interface IFBXConnections {
	parents: IFBXRelationShip[];
	children: IFBXRelationShip[];
}

export class FBXConnections {
	/**
	 * Parses the given connections node to parse all relationships.
	 * @param node defines the reference to the connections FBX node.
	 * @returns the map containing all connections.
	 */
	public static ParseConnections(node: FBXReaderNode): Map<number, IFBXConnections> {
		const connections = node.nodes("C")!;
		const map = new Map<number, IFBXConnections>();

		connections.forEach((c) => {
			const childId = c.prop(1, "number")!;
			const parentId = c.prop(2, "number")!;
			const relationship = c.prop(3, "string");

			if (!map.has(childId)) {
				map.set(childId, { parents: [], children: [] });
			}

			map.get(childId)?.parents.push({ id: parentId, relationship });

			if (!map.has(parentId)) {
				map.set(parentId, { parents: [], children: [] });
			}

			map.get(parentId)?.children.push({ id: childId, relationship });
		});

		return map;
	}
}
