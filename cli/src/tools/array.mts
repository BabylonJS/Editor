/**
 * Returns a new array composed of distinct elements.
 * @param array defines the reference to the source array.
 */
export function unique<T>(array: T[]): T[] {
	const unique = (value: T, index: number, self: T[]) => {
		return self.indexOf(value) === index;
	};

	return array.filter(unique);
}

/**
 * Compares two arrays and returns true if they are the same (same length and same elements in the same order).
 */
export function isSameArray<T>(a: T[] | Buffer, b: T[] | Buffer): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0, len = a.length; i < len; ++i) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}
