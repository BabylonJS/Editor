import { Mesh, Node, TransformNode, Vector3 } from "babylonjs";

import { IGeometrySignature, getGeometrySignature, getGeometrySimilarity } from "./geometry";
import { IMatchItem, Matches, getMatchedChildrenRatio, matchItems } from "./matcher";
import { INameInfo, areOppositeSides, createNameInfo, getNameSimilarity } from "./names";
import { getJaccardIndex, getPositionSimilarity, getWeightedAverage } from "./similarity";

/**
 * Defines the kind of a node for the matching: meshes have a geometry (instances included), transforms don't (transform
 * nodes, and meshes without geometry like the "__root__" node of the glTF files).
 */
export type NodeKind = "mesh" | "transform";

/**
 * Defines a node of the scene or of the asset prepared for the matching.
 */
export interface INodeMatchItem extends IMatchItem {
	/**
	 * Defines the reference to the node.
	 */
	node: TransformNode;
	/**
	 * Defines the kind of the node: only nodes of the same kind can be matched together.
	 */
	kind: NodeKind;
	/**
	 * Defines the parent item: the closest ancestor of the node that is a mesh or a transform node.
	 */
	parent: INodeMatchItem | null;
	/**
	 * Defines the children items.
	 */
	children: INodeMatchItem[];
	/**
	 * Defines the depth of the item in its tree (0 for the roots).
	 */
	depth: number;
	/**
	 * Defines the signature of the geometry of the node, or null if the node has no geometry.
	 */
	geometry: IGeometrySignature | null;
	/**
	 * Defines the position of the node relative to its parent.
	 */
	position: Vector3;
	/**
	 * Defines the normalized names of the children of the node.
	 */
	childrenNames: Set<string>;
	/**
	 * Defines the number of descendants per normalized name, computed when needed (see getDescendantNames).
	 */
	descendantNames?: Map<string, number>;
	/**
	 * Defines the total number of descendants, computed with descendantNames.
	 */
	descendantsCount?: number;
}

/**
 * Defines a copy of the asset found in the scene: a node of the scene and the node of the asset it corresponds to. The same
 * asset can be instantiated several times in the scene and each copy is matched with the asset independently.
 */
export interface INodeCopy {
	/**
	 * Defines the item of the scene at the root of the copy.
	 */
	sceneRoot: INodeMatchItem;
	/**
	 * Defines the item of the asset corresponding to the root of the copy.
	 */
	assetRoot: INodeMatchItem;
}

/**
 * Defines the minimum score for a node of the scene to be considered as a copy of a node of the asset.
 */
const minimumCopyScore = 0.5;

/**
 * Defines the number of times the names of the asset are found in a node of the scene above which the node is considered
 * to contain several copies of the asset (a folder containing the same model instantiated several times).
 */
const maximumCopyMultiplicity = 1.5;

/**
 * Returns whether or not the given node can be matched: only meshes, instances and transform nodes hold resources that can
 * be updated (cameras, lights, sounds, scene links, etc. are ignored). The meshes used as LOD levels are not matched as
 * nodes: they are updated with the mesh they are a LOD of (see updateMeshLods).
 * @param node defines the reference to the node to test.
 */
export function isMatchableNode(node: Node): node is TransformNode {
	switch (node.getClassName()) {
		case "Mesh":
			return !(node as Mesh)._masterMesh;

		case "InstancedMesh":
		case "TransformNode":
			return true;

		default:
			return false;
	}
}

/**
 * Returns the kind of a node for the matching, knowing the signature of its geometry.
 * @param geometry defines the signature of the geometry of the node, or null if the node has no geometry.
 */
function getNodeKind(geometry: IGeometrySignature | null): NodeKind {
	return geometry ? "mesh" : "transform";
}

/**
 * Creates the items of the given roots and of all their matchable descendants. The parent of an item is the closest
 * matchable ancestor of its node, so nodes under a light or a camera keep their place in the hierarchy.
 * @param roots defines the list of root nodes (the edited node for the scene, the root nodes for the asset).
 */
export function createNodeMatchItems(roots: Node[]): INodeMatchItem[] {
	const items: INodeMatchItem[] = [];
	const visited = new Set<Node>();

	/**
	 * Creates the item of the given node if it can be matched, then visits its children.
	 */
	const visit = (node: Node, parent: INodeMatchItem | null): void => {
		if (visited.has(node)) {
			return;
		}

		visited.add(node);

		let item = parent;
		if (isMatchableNode(node)) {
			const geometry = getGeometrySignature(node);

			item = {
				node,
				parent,
				geometry,
				children: [],
				childrenNames: new Set<string>(),
				name: createNameInfo(node.name),
				kind: getNodeKind(geometry),
				depth: parent ? parent.depth + 1 : 0,
				index: parent ? parent.children.length : 0,
				position: node.position.clone(),
			};

			items.push(item);
			parent?.children.push(item);
			parent?.childrenNames.add(item.name.normalized);
		}

		node.getChildren().forEach((child) => visit(child, item));
	};

	roots.forEach((root) => visit(root, null));

	// Roots are siblings of each other.
	items.filter((item) => !item.parent).forEach((item, index) => (item.index = index));

	return items;
}

/**
 * Returns the given item followed by all its descendants, parents first.
 * @param item defines the root item of the subtree.
 */
export function getSubtreeItems(item: INodeMatchItem): INodeMatchItem[] {
	const result: INodeMatchItem[] = [item];
	for (let i = 0; i < result.length; ++i) {
		result.push(...result[i].children);
	}

	return result;
}

/**
 * Returns the number of descendants of the given item per normalized name. Computed once per item.
 * @param item defines the item to get the descendant names.
 */
function getDescendantNames(item: INodeMatchItem): Map<string, number> {
	if (item.descendantNames) {
		return item.descendantNames;
	}

	const names = new Map<string, number>();
	let count = 0;

	item.children.forEach((child) => {
		names.set(child.name.normalized, (names.get(child.name.normalized) ?? 0) + 1);
		++count;

		getDescendantNames(child).forEach((childCount, name) => names.set(name, (names.get(name) ?? 0) + childCount));
		count += child.descendantsCount ?? 0;
	});

	item.descendantNames = names;
	item.descendantsCount = count;

	return names;
}

/**
 * Finds the copies of the asset in the scene, starting from the given roots (the edited node). A node of the scene is a copy
 * of a node of the asset when they have the same name (the root of an imported asset is named after the file) and when the
 * descendants of the node are found in the descendants of the node of the asset. When a node contains several times the
 * descendants of the asset (a folder containing the same model instantiated several times), its children are tested instead.
 * @param sceneRoots defines the list of items at the root of the edited hierarchy.
 * @param assetItems defines the list of all the items of the asset.
 * @param assetRootAliases defines the names the roots of the asset may have in the scene (name of the file).
 */
export function findNodeCopies(sceneRoots: INodeMatchItem[], assetItems: INodeMatchItem[], assetRootAliases: INameInfo[]): INodeCopy[] {
	const copies: INodeCopy[] = [];

	// Number of nodes of the asset per normalized name, used to know if a node of the scene contains nodes of the asset.
	const assetNames = new Map<string, number>();
	assetItems.forEach((item) => assetNames.set(item.name.normalized, (assetNames.get(item.name.normalized) ?? 0) + 1));

	/**
	 * Tests the given node of the scene as a copy of each node of the asset, then its children if it is not a copy.
	 */
	const visit = (sceneItem: INodeMatchItem): void => {
		let bestScore = 0;
		let bestAssetItem: INodeMatchItem | null = null;

		for (const assetItem of assetItems) {
			const score = getCopyScore(sceneItem, assetItem, assetRootAliases, assetNames);
			if (score > bestScore) {
				bestScore = score;
				bestAssetItem = assetItem;
			}
		}

		if (bestAssetItem && bestScore >= minimumCopyScore) {
			copies.push({ sceneRoot: sceneItem, assetRoot: bestAssetItem });
		} else {
			sceneItem.children.forEach((child) => visit(child));
		}
	};

	sceneRoots.forEach((root) => visit(root));

	return copies;
}

/**
 * Returns how much the given node of the scene looks like a copy of the given node of the asset, from 0 to 1:
 * - nodes having descendants on both sides are compared by name and by the names of their descendants,
 * - other nodes are compared by name and geometry, unless the node of the scene contains nodes of the asset (it is then a
 *   folder of the scene containing copies of the asset, and its children are tested instead).
 * Returns 0 when the node of the scene contains several times the descendants of the node of the asset.
 * @param sceneItem defines the item of the scene to test.
 * @param assetItem defines the item of the asset to test.
 * @param assetRootAliases defines the names the roots of the asset may have in the scene.
 * @param assetNames defines the number of nodes of the asset per normalized name.
 */
function getCopyScore(sceneItem: INodeMatchItem, assetItem: INodeMatchItem, assetRootAliases: INameInfo[], assetNames: Map<string, number>): number {
	if (sceneItem.kind !== assetItem.kind || areOppositeSides(sceneItem.name, assetItem.name)) {
		return 0;
	}

	let nameSimilarity = getNameSimilarity(sceneItem.name, assetItem.name);
	if (!assetItem.parent) {
		for (const alias of assetRootAliases) {
			nameSimilarity = Math.max(nameSimilarity, getNameSimilarity(sceneItem.name, alias));
		}
	}

	const sceneDescendantNames = getDescendantNames(sceneItem);
	const sceneCount = sceneItem.descendantsCount ?? 0;

	const assetDescendantNames = getDescendantNames(assetItem);
	const assetCount = assetItem.descendantsCount ?? 0;

	if (!sceneCount || !assetCount) {
		let fromAsset = 0;
		sceneDescendantNames.forEach((count, name) => {
			if (assetNames.has(name)) {
				fromAsset += count;
			}
		});

		if (sceneCount && fromAsset / sceneCount >= 0.5) {
			return 0;
		}

		if (sceneItem.geometry && assetItem.geometry) {
			return nameSimilarity * 0.6 + getGeometrySimilarity(sceneItem.geometry, assetItem.geometry) * 0.4;
		}

		return nameSimilarity;
	}

	let common = 0;
	let found = 0;
	sceneDescendantNames.forEach((count, name) => {
		const assetNameCount = assetDescendantNames.get(name) ?? 0;
		if (assetNameCount) {
			common += Math.min(count, assetNameCount);
			found += count;
		}
	});

	if (common && found / common >= maximumCopyMultiplicity) {
		return 0;
	}

	return nameSimilarity * 0.35 + (common / sceneCount) * 0.65;
}

/**
 * Matches the nodes of the given copy of the asset with the nodes of the asset. The root of the copy is pinned to its node
 * of the asset, then the descendants are matched by name, by similarity and by structure (see matchItems).
 * @param copy defines the copy of the asset to match.
 * @param assetItems defines the list of all the items of the asset.
 */
export function matchNodeCopy(copy: INodeCopy, assetItems: INodeMatchItem[]): Matches<INodeMatchItem> {
	const sceneItems = getSubtreeItems(copy.sceneRoot);

	return matchItems(sceneItems, assetItems, {
		minimumScore: 0.55,
		minimumStructureScore: 0.3,
		pinned: [[copy.sceneRoot, copy.assetRoot]],
		isCompatible: (scene, asset) => scene.kind === asset.kind && !areOppositeSides(scene.name, asset.name),
		getScore: (scene, asset, matches) => getNodeScore(scene, asset, matches),
		matchRelatedItems: (matches) => matchTwinNodes(sceneItems, assetItems, matches),
	});
}

/**
 * Matches the nodes that have the same name as a matched node of the other kind. For a skinned mesh, the glTF loader creates
 * a transform node (holding the transform and the children of the glTF node) and a mesh with the same name: when the mesh
 * was renamed in the asset, it is found by its geometry, and its transform node twin is found here.
 * @param sceneItems defines the list of the items of the copy in the scene.
 * @param assetItems defines the list of all the items of the asset.
 * @param matches defines the matches found so far.
 */
function matchTwinNodes(sceneItems: INodeMatchItem[], assetItems: INodeMatchItem[], matches: Matches<INodeMatchItem>): boolean {
	let found = false;

	sceneItems.forEach((sceneItem) => {
		if (matches.hasScene(sceneItem)) {
			return;
		}

		const twin = sceneItems.find((other) => other.kind !== sceneItem.kind && other.name.raw === sceneItem.name.raw && matches.hasScene(other));
		const twinMatch = twin ? matches.getMatch(twin) : null;
		if (!twinMatch) {
			return;
		}

		const candidates = assetItems.filter((assetItem) => {
			return !matches.hasAsset(assetItem) && assetItem.kind === sceneItem.kind && assetItem.name.raw === twinMatch.asset.name.raw;
		});

		if (candidates.length === 1) {
			matches.add(sceneItem, candidates[0], twinMatch.reason === "pinned" ? "name" : twinMatch.reason, twinMatch.score);
			found = true;
		}
	});

	return found;
}

/**
 * Returns the similarity score of the given nodes, from 0 to 1, combining the name, the geometry, the parent, the position
 * relative to the parent, the children (same names or already matched together) and the index among the siblings. Returns 0
 * when nothing proves that the nodes are the same: a similar name, a similar geometry, the same position under the same parent
 * (transforms only, as meshes often have no offset) or similar children.
 * @param scene defines the item of the scene.
 * @param asset defines the item of the asset.
 * @param matches defines the matches found so far.
 */
export function getNodeScore(scene: INodeMatchItem, asset: INodeMatchItem, matches: Matches<INodeMatchItem>): number {
	const name = getNameSimilarity(scene.name, asset.name);
	const geometry = scene.geometry && asset.geometry ? getGeometrySimilarity(scene.geometry, asset.geometry) : null;

	const sceneParentMatch = scene.parent ? matches.getAsset(scene.parent) : null;
	const isParentMatched = sceneParentMatch !== null && sceneParentMatch === asset.parent;

	let parent = 0.5;
	if (!scene.parent && !asset.parent) {
		parent = 1;
	} else if (sceneParentMatch) {
		parent = isParentMatched ? 1 : 0;
	}

	const position = getPositionSimilarity(scene.position, asset.position);
	const hasOffset = scene.position.lengthSquared() > 1e-12 || asset.position.lengthSquared() > 1e-12;

	// Children having the same names, or children already matched with each other (found by geometry, position...).
	const children =
		scene.children.length || asset.children.length ? Math.max(getJaccardIndex(scene.childrenNames, asset.childrenNames), getMatchedChildrenRatio(scene, asset, matches)) : null;

	const hasIdentity = name >= 0.6 || (geometry ?? 0) >= 0.9 || (children ?? 0) >= 0.6 || (scene.kind === "transform" && isParentMatched && hasOffset && position >= 0.9);

	if (!hasIdentity) {
		return 0;
	}

	return getWeightedAverage([
		[name, 4],
		[geometry, 3],
		[parent, 2],
		[position, 2],
		[children, 1.5],
		[1 / (1 + Math.abs(scene.index - asset.index)), 0.5],
	]);
}
