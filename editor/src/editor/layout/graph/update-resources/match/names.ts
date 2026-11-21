/**
 * Defines the side of the object described by a name, read from its words ("Arm.L", "LeftArm", "arm_left"...).
 */
export type NameSide = "left" | "right" | null;

/**
 * Defines the information computed once per name so that comparing names during the matching is cheap.
 */
export interface INameInfo {
	/**
	 * Defines the name as it is, used for the exact matches.
	 */
	raw: string;
	/**
	 * Defines the name in lower case, without namespace, duplicate suffix nor separators: "mixamorig:Left_Arm.001" gives "leftarm".
	 */
	normalized: string;
	/**
	 * Defines the sorted words of the name, with the sides written in full: "Arm.L" and "LeftArm" both give "arm left".
	 */
	tokenKey: string;
	/**
	 * Defines the words of the name without the "_primitiveX" suffix that the glTF loader adds to the meshes of the primitives.
	 */
	stem: string;
	/**
	 * Defines the index of the primitive read from the "_primitiveX" suffix, or null when the name has no such suffix.
	 */
	primitive: number | null;
	/**
	 * Defines the side of the object described by the name.
	 */
	side: NameSide;
	/**
	 * Defines the numbers written in the name (except the index of the primitive), used to tell "Finger1" from "Finger2".
	 */
	numbers: string;
	/**
	 * Defines the number of occurrences of each pair of consecutive characters of the normalized name.
	 */
	bigrams: Map<string, number>;
	/**
	 * Defines the total number of pairs of consecutive characters of the normalized name.
	 */
	bigramsCount: number;
}

/**
 * Defines the words that describe a side, and the side they describe.
 */
const sideWords = new Map<string, "left" | "right">([
	["l", "left"],
	["left", "left"],
	["r", "right"],
	["right", "right"],
]);

const numberRegex = /^\d+$/;

/**
 * Computes the information used to compare the given name with other names.
 * @param name defines the name of the object (node, bone, animation group, morph target...).
 */
export function createNameInfo(name: string | null | undefined): INameInfo {
	const raw = name ?? "";

	const tokens = getNameTokens(removeDuplicateSuffix(removeNamespace(raw)));
	const words = tokens.map((token) => sideWords.get(token) ?? token);

	// The glTF loader names the meshes of the primitives of a mesh "name_primitiveX" when the mesh has several primitives.
	let primitive: number | null = null;
	let stemWords = words;
	if (words.length >= 3 && words[words.length - 2] === "primitive" && numberRegex.test(words[words.length - 1])) {
		primitive = parseInt(words[words.length - 1], 10);
		stemWords = words.slice(0, -2);
	}

	const normalized = tokens.join("") || raw.toLowerCase();
	const bigrams = getBigrams(normalized);

	return {
		raw,
		normalized,
		primitive,
		tokenKey: words.slice().sort().join(" ") || normalized,
		stem: stemWords.join(""),
		side: getSide(words),
		numbers: stemWords.filter((word) => numberRegex.test(word)).join(","),
		bigrams: bigrams.map,
		bigramsCount: bigrams.count,
	};
}

/**
 * Returns how much the two given names look alike, from 0 (nothing in common, or opposite sides) to 1 (same name).
 * Same names once normalized (case, separators, namespaces, duplicate suffixes, order of the words) score from 0.9 to 0.95,
 * other names are compared character by character (Sørensen-Dice coefficient on the pairs of characters).
 * @param a defines the information about the first name.
 * @param b defines the information about the second name.
 */
export function getNameSimilarity(a: INameInfo, b: INameInfo): number {
	if (a.raw === b.raw) {
		return 1;
	}

	if (areOppositeSides(a, b)) {
		return 0;
	}

	if (a.normalized === b.normalized) {
		return 0.95;
	}

	if (a.tokenKey === b.tokenKey) {
		return 0.9;
	}

	if (a.stem && a.stem === b.stem) {
		return getPrimitiveSimilarity(a.primitive, b.primitive);
	}

	let similarity = getDiceCoefficient(a, b);

	// "Finger1" and "Finger2" look alike but are different objects.
	if (a.numbers && b.numbers && a.numbers !== b.numbers) {
		similarity *= 0.5;
	}

	return similarity * 0.85;
}

/**
 * Returns whether or not the two given names describe objects of opposite sides ("Arm.L" and "Arm.R"). Such objects must
 * never be matched together, even if their names look alike.
 * @param a defines the information about the first name.
 * @param b defines the information about the second name.
 */
export function areOppositeSides(a: INameInfo, b: INameInfo): boolean {
	return a.side !== null && b.side !== null && a.side !== b.side;
}

/**
 * Returns the similarity of two names that only differ by their "_primitiveX" suffix. A mesh that had a single primitive
 * ("Body") is most likely the first primitive of the mesh once it has several ("Body_primitive0").
 */
function getPrimitiveSimilarity(a: number | null, b: number | null): number {
	if (a === null || b === null) {
		return (a ?? b) === 0 ? 0.85 : 0.6;
	}

	return 0.5;
}

/**
 * Removes the namespace of the given name: "mixamorig:Hips" gives "Hips" and "Armature|Walk" gives "Walk".
 */
function removeNamespace(name: string): string {
	const parts = name.split(/[:|]/).filter((part) => part.length > 0);
	return parts[parts.length - 1] ?? name;
}

/**
 * Removes the suffix that DCC tools like Blender add to the names of the duplicated objects: "Cube.001" gives "Cube".
 */
function removeDuplicateSuffix(name: string): string {
	return name.replace(/\.\d{3}$/, "");
}

/**
 * Splits the given name into lower case words, on separators and on case and letter/number changes:
 * "LeftArm_02" gives ["left", "arm", "02"].
 */
function getNameTokens(name: string): string[] {
	return name
		.replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
		.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
		.replace(/(\p{L})(\p{N})/gu, "$1 $2")
		.replace(/(\p{N})(\p{L})/gu, "$1 $2")
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((token) => token.length > 0);
}

/**
 * Returns the side described by the given words, or null when the words describe no side (or both).
 */
function getSide(words: string[]): NameSide {
	const left = words.includes("left");
	const right = words.includes("right");

	if (left === right) {
		return null;
	}

	return left ? "left" : "right";
}

/**
 * Counts the pairs of consecutive characters of the given value. A single character counts as one pair.
 */
function getBigrams(value: string): { map: Map<string, number>; count: number } {
	const map = new Map<string, number>();

	if (value.length === 1) {
		map.set(value, 1);
		return { map, count: 1 };
	}

	for (let i = 0; i < value.length - 1; ++i) {
		const bigram = value.substring(i, i + 2);
		map.set(bigram, (map.get(bigram) ?? 0) + 1);
	}

	return { map, count: Math.max(0, value.length - 1) };
}

/**
 * Returns the Sørensen-Dice coefficient of the pairs of characters of the two given names: twice the number of pairs they
 * have in common divided by their total number of pairs.
 */
function getDiceCoefficient(a: INameInfo, b: INameInfo): number {
	if (!a.bigramsCount || !b.bigramsCount) {
		return 0;
	}

	let common = 0;
	a.bigrams.forEach((count, bigram) => {
		common += Math.min(count, b.bigrams.get(bigram) ?? 0);
	});

	return (2 * common) / (a.bigramsCount + b.bigramsCount);
}
