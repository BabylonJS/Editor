import { INameInfo } from "./names";

/**
 * Defines an item that can be matched: a node, a bone, an animation group, a morph target... with the information the
 * matcher needs. Items of flat lists (animation groups, morph targets) have no parent nor children.
 */
export interface IMatchItem {
	/**
	 * Defines the information about the name of the object described by the item.
	 */
	name: INameInfo;
	/**
	 * Defines the parent item in the same tree, or null for the roots and the items of flat lists.
	 */
	parent: IMatchItem | null;
	/**
	 * Defines the children items in the same tree.
	 */
	children: IMatchItem[];
	/**
	 * Defines the index of the item among its siblings, or in its list.
	 */
	index: number;
}

/**
 * Defines why two items were matched together:
 * - "pinned": the match was given to the matcher (root of a copy, bones linked to matched nodes...),
 * - "exact": same name,
 * - "name": same name once normalized (case, separators, namespaces, duplicate suffixes, order of the words, sides),
 * - "structure": only remaining candidates under matched parents,
 * - "similar": best similarity score.
 */
export type MatchReason = "pinned" | "exact" | "name" | "structure" | "similar";

/**
 * Defines a match between an item of the scene and an item of the asset.
 */
export interface IMatch<T extends IMatchItem> {
	/**
	 * Defines the item of the scene.
	 */
	scene: T;
	/**
	 * Defines the item of the asset matched with the item of the scene.
	 */
	asset: T;
	/**
	 * Defines why the items were matched together.
	 */
	reason: MatchReason;
	/**
	 * Defines the confidence of the match, from 0 to 1.
	 */
	score: number;
}

/**
 * Defines the options of the matcher: how items are compared.
 */
export interface IMatcherOptions<T extends IMatchItem> {
	/**
	 * Returns whether or not the given items can be matched together at all (same kind, same side, etc.).
	 */
	isCompatible: (scene: T, asset: T) => boolean;
	/**
	 * Returns the similarity score (from 0 to 1) of the given compatible items, knowing the matches found so far.
	 * Must return 0 when nothing proves that the items describe the same object.
	 */
	getScore: (scene: T, asset: T, matches: Matches<T>) => number;
	/**
	 * Defines the minimum score for two items to be matched by similarity.
	 */
	minimumScore: number;
	/**
	 * Defines the minimum score for the only remaining children of matched parents to be matched together. When not
	 * set, items are never matched because of the structure only (flat lists).
	 */
	minimumStructureScore?: number;
	/**
	 * Defines the pairs of items (scene, asset) known to match before running the matcher.
	 */
	pinned?: [T, T][];
	/**
	 * Defines an optional pass, specific to the kind of items, run after the passes by name: it can match items deduced from
	 * the matches found so far. Returns whether or not new matches were found.
	 */
	matchRelatedItems?: (matches: Matches<T>) => boolean;
}

/**
 * Stores the matches found by the matcher: each item of the scene is matched at most once and each item of the asset is
 * matched at most once.
 */
export class Matches<T extends IMatchItem> {
	private readonly _list: IMatch<T>[] = [];
	private readonly _byScene = new Map<T, IMatch<T>>();
	private readonly _byAsset = new Map<T, IMatch<T>>();

	/**
	 * Gets the list of all the matches, in the order they were found.
	 */
	public get list(): readonly IMatch<T>[] {
		return this._list;
	}

	/**
	 * Adds a new match between the given items. Does nothing if one of the items is already matched.
	 * @param scene defines the item of the scene.
	 * @param asset defines the item of the asset.
	 * @param reason defines why the items are matched together.
	 * @param score defines the confidence of the match, from 0 to 1.
	 */
	public add(scene: T, asset: T, reason: MatchReason, score: number): void {
		if (this._byScene.has(scene) || this._byAsset.has(asset)) {
			return;
		}

		const match = { scene, asset, reason, score } as IMatch<T>;

		this._list.push(match);
		this._byScene.set(scene, match);
		this._byAsset.set(asset, match);
	}

	/**
	 * Returns the match of the given item of the scene, or null if it is not matched.
	 * @param scene defines the item of the scene.
	 */
	public getMatch(scene: T): IMatch<T> | null {
		return this._byScene.get(scene) ?? null;
	}

	/**
	 * Returns the item of the asset matched with the given item of the scene, or null if it is not matched.
	 * @param scene defines the item of the scene.
	 */
	public getAsset(scene: T): T | null {
		return this._byScene.get(scene)?.asset ?? null;
	}

	/**
	 * Returns whether or not the given item of the scene is matched.
	 * @param scene defines the item of the scene.
	 */
	public hasScene(scene: T): boolean {
		return this._byScene.has(scene);
	}

	/**
	 * Returns whether or not the given item of the asset is matched.
	 * @param asset defines the item of the asset.
	 */
	public hasAsset(asset: T): boolean {
		return this._byAsset.has(asset);
	}
}

/**
 * Returns the ratio of the children of the given items that are matched with each other, from 0 to 1: 1 when every child of
 * the item of the scene is matched with a child of the item of the asset and they have as many children. Used as structural
 * evidence when the children were found before their parent (renamed parent, children found by geometry...).
 * @param scene defines the item of the scene.
 * @param asset defines the item of the asset.
 * @param matches defines the matches found so far.
 */
export function getMatchedChildrenRatio<T extends IMatchItem>(scene: T, asset: T, matches: Matches<T>): number {
	if (!scene.children.length || !asset.children.length) {
		return 0;
	}

	let count = 0;
	for (const child of scene.children) {
		if (matches.getAsset(child as T)?.parent === asset) {
			++count;
		}
	}

	return count / Math.max(scene.children.length, asset.children.length);
}

/**
 * Defines a key used to match items by name, with the reason given to the matches it finds.
 */
interface INameKey {
	/**
	 * Returns the key of the given name: items having the same key are matched together.
	 */
	getKey: (name: INameInfo) => string;
	/**
	 * Defines the reason given to the matches found with the key.
	 */
	reason: MatchReason;
}

/**
 * Defines the keys used to match items by name, from the strictest to the loosest.
 */
const nameKeys: INameKey[] = [
	{ getKey: (name) => name.raw, reason: "exact" },
	{ getKey: (name) => name.normalized, reason: "name" },
	{ getKey: (name) => name.tokenKey, reason: "name" },
];

/**
 * Matches the items of the scene with the items of the asset, one to one. The passes are run from the most reliable to the
 * least reliable, until no new match is found:
 * 1. the pinned pairs,
 * 2. the children of matched items having the same name, then the items having a name that is unique on both sides (first
 *    the exact names, then the normalized names, then the words of the names), then the items deduced from the matches found
 *    so far (see IMatcherOptions.matchRelatedItems),
 * 3. the pairs having the best similarity scores (name, geometry, hierarchy, position, etc. depending on the items),
 * 4. the only remaining children of matched items, when they are similar enough.
 * Each new match gives context to the next passes: the children of a renamed node are found by name under it, etc.
 * @param sceneItems defines the list of items of the scene to match.
 * @param assetItems defines the list of items of the asset to match.
 * @param options defines the options of the matcher.
 */
export function matchItems<T extends IMatchItem>(sceneItems: T[], assetItems: T[], options: IMatcherOptions<T>): Matches<T> {
	const matches = new Matches<T>();

	options.pinned?.forEach(([scene, asset]) => {
		matches.add(scene, asset, "pinned", 1);
	});

	let found = true;
	while (found) {
		found = false;

		for (const nameKey of nameKeys) {
			found = matchChildrenByName(matches, options, nameKey) || found;
			found = matchGroupsByName(sceneItems, assetItems, matches, options, nameKey, true) || found;
		}

		if (options.matchRelatedItems) {
			found = options.matchRelatedItems(matches) || found;
		}

		if (!found) {
			found = matchBySimilarity(sceneItems, assetItems, matches, options);
		}

		if (!found && options.minimumStructureScore !== undefined) {
			found = matchOrphans(matches, options, options.minimumStructureScore);
		}
	}

	return matches;
}

/**
 * Matches by name the children of the matched items. The list of matches grows while it is iterated, so the descendants of
 * the new matches are processed in the same pass.
 */
function matchChildrenByName<T extends IMatchItem>(matches: Matches<T>, options: IMatcherOptions<T>, nameKey: INameKey): boolean {
	let found = false;

	const list = matches.list;
	for (let i = 0; i < list.length; ++i) {
		const { scene, asset } = list[i];
		if (scene.children.length && asset.children.length) {
			found = matchGroupsByName(scene.children as T[], asset.children as T[], matches, options, nameKey, false) || found;
		}
	}

	return found;
}

/**
 * Matches the unmatched items of the given lists that have the same key. When several items share the same key, they are
 * matched only if they are as many in the scene as in the asset (siblings are then matched in order) unless the key must be
 * unique, in which case they are left to the next passes.
 */
function matchGroupsByName<T extends IMatchItem>(
	sceneItems: T[],
	assetItems: T[],
	matches: Matches<T>,
	options: IMatcherOptions<T>,
	nameKey: INameKey,
	uniqueOnly: boolean
): boolean {
	const { getKey, reason } = nameKey;

	const assetGroups = new Map<string, T[]>();
	assetItems.forEach((asset) => {
		const key = getKey(asset.name);
		if (key && !matches.hasAsset(asset)) {
			const group = assetGroups.get(key) ?? [];
			assetGroups.set(key, group.concat(asset));
		}
	});

	if (!assetGroups.size) {
		return false;
	}

	const sceneGroups = new Map<string, T[]>();
	sceneItems.forEach((scene) => {
		const key = getKey(scene.name);
		if (key && !matches.hasScene(scene) && assetGroups.has(key)) {
			const group = sceneGroups.get(key) ?? [];
			sceneGroups.set(key, group.concat(scene));
		}
	});

	let found = false;

	sceneGroups.forEach((sceneGroup, key) => {
		const assetGroup = assetGroups.get(key)!;

		sceneGroup.forEach((scene) => {
			const candidates = assetGroup.filter((asset) => !matches.hasAsset(asset) && options.isCompatible(scene, asset));
			if (!candidates.length) {
				return;
			}

			const rivals = sceneGroup.filter((other) => !matches.hasScene(other) && candidates.some((asset) => options.isCompatible(other, asset)));

			const isUnique = candidates.length === 1 && rivals.length === 1;
			if (isUnique || (!uniqueOnly && candidates.length === rivals.length)) {
				matches.add(scene, candidates[0], reason, 1);
				found = true;
			}
		});
	});

	return found;
}

/**
 * Matches the unmatched items having the best similarity scores, greedily from the best score to the worst.
 */
function matchBySimilarity<T extends IMatchItem>(sceneItems: T[], assetItems: T[], matches: Matches<T>, options: IMatcherOptions<T>): boolean {
	const unmatchedSceneItems = sceneItems.filter((scene) => !matches.hasScene(scene));
	const unmatchedAssetItems = assetItems.filter((asset) => !matches.hasAsset(asset));

	const candidates: IMatch<T>[] = [];
	for (const scene of unmatchedSceneItems) {
		for (const asset of unmatchedAssetItems) {
			if (!options.isCompatible(scene, asset)) {
				continue;
			}

			const score = options.getScore(scene, asset, matches);
			if (score >= options.minimumScore) {
				candidates.push({ scene, asset, score, reason: "similar" });
			}
		}
	}

	// The sort is stable: equal scores keep the order of the items.
	candidates.sort((a, b) => b.score - a.score);

	let found = false;

	candidates.forEach((candidate) => {
		if (!matches.hasScene(candidate.scene) && !matches.hasAsset(candidate.asset)) {
			matches.add(candidate.scene, candidate.asset, candidate.reason, candidate.score);
			found = true;
		}
	});

	return found;
}

/**
 * Matches the children of matched items that are the only remaining compatible candidates for each other, when their score
 * reaches the given minimum. Typically a renamed bone at the end of a chain.
 */
function matchOrphans<T extends IMatchItem>(matches: Matches<T>, options: IMatcherOptions<T>, minimumScore: number): boolean {
	let found = false;

	const list = matches.list;
	for (let i = 0; i < list.length; ++i) {
		const { scene, asset } = list[i];

		const sceneChildren = (scene.children as T[]).filter((child) => !matches.hasScene(child));
		const assetChildren = (asset.children as T[]).filter((child) => !matches.hasAsset(child));

		for (const sceneChild of sceneChildren) {
			const candidates = assetChildren.filter((assetChild) => !matches.hasAsset(assetChild) && options.isCompatible(sceneChild, assetChild));
			if (candidates.length !== 1) {
				continue;
			}

			const rivals = sceneChildren.filter((other) => !matches.hasScene(other) && options.isCompatible(other, candidates[0]));
			if (rivals.length !== 1) {
				continue;
			}

			const score = options.getScore(sceneChild, candidates[0], matches);
			if (score >= minimumScore) {
				matches.add(sceneChild, candidates[0], "structure", score);
				found = true;
			}
		}
	}

	return found;
}
