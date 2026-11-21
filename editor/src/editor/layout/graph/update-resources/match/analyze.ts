import { basename, extname } from "path/posix";

import { AssetContainer, Node, Scene } from "babylonjs";

import { IUpdateResourcesAnalysis, IUpdateResourcesAnimationGroupItem, IUpdateResourcesCopy, IUpdateResourcesNodeItem, UpdateResourcesMatchReason } from "../types";

import { createNameInfo } from "./names";
import { canUpdateGeometry } from "./geometry";
import { IMatch, MatchReason } from "./matcher";
import { INodeMatchItem, createNodeMatchItems, findNodeCopies, getSubtreeItems, matchNodeCopy } from "./nodes";
import { createAnimationGroupMatchItems, getAnimationGroupsCopies, getResolvedAnimationsCount, matchAnimationGroups } from "./animation-groups";

/**
 * Analyzes the given node of the scene and its descendants against the given loaded asset:
 * 1. finds the copies of the asset in the hierarchy (the asset can be instantiated several times, or only a part of it can
 *    be edited). When none is found, the edited node is considered as a copy of the root of the asset,
 * 2. matches the nodes of each copy with the nodes of the asset,
 * 3. matches the animation groups animating each copy with the animation groups of the asset.
 * By default, every matched mesh is selected to be updated (geometry, skeleton, morph targets and LODs) as well as every
 * matched animation group and every animation group of the asset that doesn't exist yet in a copy. Transforms and materials
 * are not updated by default as they are often modified in the editor, and nothing is removed by default.
 * @param node defines the reference to the node of the scene to update (with its descendants).
 * @param container defines the reference to the container of the loaded asset.
 * @param filename defines the absolute path of the asset file, used to recognize the root of the imported asset.
 */
export function analyzeResourcesUpdate(node: Node, container: AssetContainer, filename: string): IUpdateResourcesAnalysis {
	const sceneItems = createNodeMatchItems([node]);
	const sceneRoots = sceneItems.filter((item) => !item.parent);

	const assetRoots: Node[] = [...container.meshes, ...container.transformNodes, ...container.lights, ...container.cameras].filter((assetNode) => !assetNode.parent);
	const assetItems = createNodeMatchItems(assetRoots);

	// The root of an imported asset is named after the asset file.
	const assetRootAliases = [createNameInfo(basename(filename)), createNameInfo(basename(filename, extname(filename)))];

	const nodeCopies = findNodeCopies(sceneRoots, assetItems, assetRootAliases);

	// The user chose this node and this asset: when nothing looks like a copy of the asset (asset heavily renamed, exported
	// from another tool...), the edited node is considered as a copy of the root of the asset so its descendants can still be
	// matched by similarity (geometry, position...).
	const assetRootItems = assetItems.filter((item) => !item.parent);
	if (!nodeCopies.length && sceneRoots.length === 1 && assetRootItems.length === 1 && sceneRoots[0].kind === assetRootItems[0].kind) {
		nodeCopies.push({ sceneRoot: sceneRoots[0], assetRoot: assetRootItems[0] });
	}

	const copies = nodeCopies.map((nodeCopy, index) => ({ index, sceneRoot: nodeCopy.sceneRoot.node, assetRoot: nodeCopy.assetRoot.node }) as IUpdateResourcesCopy);

	const matches = new Map<INodeMatchItem, { copy: IUpdateResourcesCopy; match: IMatch<INodeMatchItem> | null }>();
	nodeCopies.forEach((nodeCopy, index) => {
		const copyMatches = matchNodeCopy(nodeCopy, assetItems);
		getSubtreeItems(nodeCopy.sceneRoot).forEach((item) => {
			matches.set(item, { copy: copies[index], match: copyMatches.getMatch(item) });
		});
	});

	const nodes = sceneItems.map((item, index) => {
		const copy = matches.get(item)?.copy ?? null;
		const match = matches.get(item)?.match ?? null;
		const isCopyRoot = copy?.sceneRoot === item.node;

		return {
			copy,
			isCopyRoot,
			key: `node-${index}`,
			node: item.node,
			depth: item.depth,
			match: match?.asset.node ?? null,
			reason: match ? getMatchReason(match.reason, isCopyRoot) : "none",
			score: match?.score ?? 0,
			updateGeometry: match ? canUpdateGeometry(item.node, match.asset.node) : false,
			updateTransform: false,
			remove: false,
		} as IUpdateResourcesNodeItem;
	});

	return {
		filename,
		container,
		copies,
		nodes,
		animationGroups: analyzeAnimationGroups(node.getScene(), container, copies, nodes),
		assetNodes: assetItems.map((item) => item.node),
		assetMeshes: assetItems.filter((item) => item.kind === "mesh").map((item) => item.node),
		updateMaterials: false,
		removedLodMeshes: new Set(),
	};
}

/**
 * Matches, for each copy of the asset, the animation groups of the scene animating the copy with the animation groups of the
 * asset. The animation groups of the asset that are not found in a copy are proposed to be added to it, as long as they
 * animate something in the copy.
 * @param scene defines the reference to the scene containing the copies.
 * @param container defines the reference to the container of the loaded asset.
 * @param copies defines the list of the copies of the asset found in the scene.
 * @param nodes defines the list of the nodes of the edited hierarchy with their match.
 */
function analyzeAnimationGroups(scene: Scene, container: AssetContainer, copies: IUpdateResourcesCopy[], nodes: IUpdateResourcesNodeItem[]): IUpdateResourcesAnimationGroupItem[] {
	const items: IUpdateResourcesAnimationGroupItem[] = [];

	const animationGroupsCopies = getAnimationGroupsCopies(scene.animationGroups, nodes);
	const assetItems = createAnimationGroupMatchItems(container.animationGroups);

	copies.forEach((copy) => {
		const sceneItems = createAnimationGroupMatchItems(scene.animationGroups.filter((animationGroup) => animationGroupsCopies.get(animationGroup) === copy));
		const matches = matchAnimationGroups(sceneItems, assetItems);

		sceneItems.forEach((sceneItem) => {
			const match = matches.getMatch(sceneItem);

			items.push({
				copy,
				key: `animation-group-${items.length}`,
				animationGroup: sceneItem.animationGroup,
				match: match?.asset.animationGroup ?? null,
				reason: match ? getMatchReason(match.reason, false) : "none",
				score: match?.score ?? 0,
				update: match !== null,
			});
		});

		assetItems.forEach((assetItem) => {
			if (matches.hasAsset(assetItem) || !getResolvedAnimationsCount(assetItem.animationGroup, copy, nodes)) {
				return;
			}

			items.push({
				copy,
				key: `animation-group-${items.length}`,
				animationGroup: null,
				match: assetItem.animationGroup,
				reason: "none",
				score: 0,
				update: true,
			});
		});
	});

	return items;
}

/**
 * Returns the reason of a match to show in the dialog.
 * @param reason defines why the matcher matched the objects.
 * @param isCopyRoot defines whether or not the object is the root of a copy of the asset.
 */
function getMatchReason(reason: MatchReason, isCopyRoot: boolean): UpdateResourcesMatchReason {
	if (isCopyRoot || reason === "pinned") {
		return "root";
	}

	return reason;
}
