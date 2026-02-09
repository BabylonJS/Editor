/**
 * Returns the power of two sizes until the given limit.
 * @param limit The limit size.
 * @param from The starting size. Default is 1.
 * @returns An array of power of two sizes.
 */
export function getPowerOfTwoSizesUntil(limit: number = 4096, from?: number): number[] {
	let size = from ?? 1;

	const result: number[] = [];

	while (size <= limit) {
		result.push(size);
		size <<= 1;
	}

	return result;
}

export function getPowerOfTwoUntil(limit: number): number {
	let size = 1;

	while (size <= limit) {
		size <<= 1;
	}

	return size >> 1;
}
