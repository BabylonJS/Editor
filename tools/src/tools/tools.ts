/**
 * Wait for a given amount of time expressed in milliseconds.
 * @param timeMs The time to wait in milliseconds.
 * @returns A promise that resolves after the given amount of time.
 */
export function waitMs(timeMs: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(() => resolve(), timeMs);
	});
}

/**
 * Wait until a given predicate returns true.
 * @param predicate Defines the predicate to wait for.
 */
export async function waitUntil(predicate: () => any): Promise<void> {
	while (!predicate()) {
		await waitMs(150);
	}
}

/**
 * Clones the given JavaScript object. This function does not handle cyclic references.
 * @param source defines the reference to the JavaScript object to clone.
 */
export function cloneJSObject<T>(source: T): T {
	if (!source) {
		return source;
	}

	return JSON.parse(JSON.stringify(source));
}
