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
