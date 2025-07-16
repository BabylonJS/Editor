/**
 * Returns true if the current platform is macOS.
 * @returns True if the current platform is macOS.
 */
export function isDarwin() {
	return process.platform === "darwin";
}

/**
 * Returns true if the current platform is Windows.
 * @returns True if the current platform is Windows.
 */
export function isWindows() {
	return process.platform === "win32";
}
