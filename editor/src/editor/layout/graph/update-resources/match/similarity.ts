import { Vector3 } from "babylonjs";

/**
 * Defines a similarity (from 0 to 1, or null when it can't be computed) and how much it counts in an average.
 */
export type WeightedSimilarity = [similarity: number | null, weight: number];

/**
 * Returns the ratio between the smallest and the largest of the two given values: 1 when they are equal, close to 0 when
 * they are very different. Values that are both smaller than the given epsilon are considered equal.
 * @param a defines the first value to compare.
 * @param b defines the second value to compare.
 * @param epsilon defines the value under which a value is considered as zero.
 */
export function getRatio(a: number, b: number, epsilon: number = 1e-6): number {
	const absoluteA = Math.abs(a);
	const absoluteB = Math.abs(b);

	const max = Math.max(absoluteA, absoluteB);
	if (max <= epsilon) {
		return 1;
	}

	return Math.min(absoluteA, absoluteB) / max;
}

/**
 * Returns the Jaccard index of the two given sets: the number of values they have in common divided by the number of distinct
 * values they contain. Two empty sets are considered equal.
 * @param a defines the first set to compare.
 * @param b defines the second set to compare.
 */
export function getJaccardIndex<T>(a: Set<T>, b: Set<T>): number {
	if (!a.size && !b.size) {
		return 1;
	}

	let common = 0;
	a.forEach((value) => {
		if (b.has(value)) {
			++common;
		}
	});

	return common / (a.size + b.size - common);
}

/**
 * Returns the weighted average of the given similarities. The similarities that can't be computed (null) are ignored.
 * @param similarities defines the list of similarities to average with their weight.
 */
export function getWeightedAverage(similarities: WeightedSimilarity[]): number {
	let sum = 0;
	let weights = 0;

	for (const [similarity, weight] of similarities) {
		if (similarity === null) {
			continue;
		}

		sum += similarity * weight;
		weights += weight;
	}

	return weights > 0 ? sum / weights : 0;
}

/**
 * Returns how much the two given local positions look alike: 1 when they are equal, decreasing quickly when their distance
 * grows compared to their length (10% of their length gives ~0.37). Used to recognize renamed nodes and bones from their
 * offset to their parent.
 * @param a defines the first position to compare.
 * @param b defines the second position to compare.
 */
export function getPositionSimilarity(a: Vector3, b: Vector3): number {
	const distance = Vector3.Distance(a, b);
	const length = Math.max(a.length(), b.length());

	if (length <= 1e-6) {
		return distance <= 1e-6 ? 1 : 0;
	}

	return Math.exp(-distance / (0.1 * length));
}
