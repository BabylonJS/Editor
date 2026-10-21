const warnedKeys = new Set<string>();

/**
 * Logs the given warning only once, typically to notify that a feature of the editor is not supported by Babylon Lite.
 * @param key defines the key identifying the warning.
 * @param message defines the message of the warning.
 */
export function warnOnce(key: string, message: string): void {
	if (warnedKeys.has(key)) {
		return;
	}

	warnedKeys.add(key);
	console.warn(`Babylon.js Editor Tools Lite: ${message}`);
}
