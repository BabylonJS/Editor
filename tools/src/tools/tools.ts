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
