import { platform } from "os";
import { shell } from "electron";

import { executeAsync } from "./process";

/**
 * Runs the given command using `executeAsync` (which also fixes the PATH on macOS so CLI tools
 * launched from the bundled app can be resolved). Resolves true on success, false otherwise.
 */
async function runCommand(command: string): Promise<boolean> {
	try {
		await executeAsync(command);
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Returns wether or not the given CLI command is available on the system.
 */
async function checkCommandAvailable(command: string): Promise<boolean> {
	return runCommand(`${command} --version`);
}

/**
 * Defines for each supported IDE identifier the CLI command and the macOS application name
 * used to launch it. Identifiers must match the ones exposed in the editor preferences.
 */
const ideLaunchers: Record<string, { cli: string; macApp?: string }> = {
	code: { cli: "code", macApp: "Visual Studio Code" },
	cursor: { cli: "cursor", macApp: "Cursor" },
	subl: { cli: "subl", macApp: "Sublime Text" },
	phpstorm: { cli: "phpstorm", macApp: "PhpStorm" },
	webstorm: { cli: "webstorm", macApp: "WebStorm" },
	idea: { cli: "idea", macApp: "IntelliJ IDEA" },
};

/**
 * Tries to open the given path with the IDE matching the given identifier.
 * Returns true when the IDE could be launched, false otherwise.
 */
async function tryLaunchIde(ide: string, normalizedPath: string): Promise<boolean> {
	const launcher = ideLaunchers[ide];
	if (!launcher) {
		return false;
	}

	// Prefer the CLI command when available (works on all platforms).
	if (await checkCommandAvailable(launcher.cli)) {
		if (await runCommand(`${launcher.cli} "${normalizedPath}"`)) {
			return true;
		}
	}

	// On macOS, fallback to launching the application by its name.
	if (platform() === "darwin" && launcher.macApp) {
		return runCommand(`open -a "${launcher.macApp}" "${normalizedPath}"`);
	}

	return false;
}

/**
 * Opens the given path (file or folder) in an IDE.
 * @param path defines the absolute path to the file or folder to open.
 * @param isDirectory defines wether or not the given path points to a directory.
 * @param ide defines the identifier of the preferred IDE to use. When set to "auto" (or omitted)
 * the first available IDE is detected and used. When set to "system" the OS default application is used.
 */
export async function openInIde(path: string, isDirectory: boolean, ide?: string): Promise<void> {
	const isWindows = platform() === "win32";
	const normalizedPath = isWindows ? path.replace(/\//g, "\\") : path.replace(/\\/g, "/");

	// Open with the system default application when explicitly requested.
	if (ide === "system") {
		shell.openPath(normalizedPath);
		return;
	}

	// When a specific IDE is selected in the preferences, try it first.
	if (ide && ide !== "auto" && ideLaunchers[ide]) {
		if (await tryLaunchIde(ide, normalizedPath)) {
			return;
		}
		// Fall through to auto-detection if the selected IDE could not be launched.
	}

	if (isDirectory) {
		// Try to open the directory in one of the CLI-based IDEs (works on all platforms).
		for (const command of ["code", "cursor", "subl"]) {
			if (await checkCommandAvailable(command)) {
				if (await runCommand(`${command} "${normalizedPath}"`)) {
					return;
				}
			}
		}

		// On macOS, try JetBrains IDEs (PhpStorm, WebStorm, IntelliJ IDEA).
		if (platform() === "darwin") {
			for (const app of ["PhpStorm", "WebStorm", "IntelliJ IDEA", "IntelliJ IDEA CE"]) {
				if (await runCommand(`open -a "${app}" "${normalizedPath}"`)) {
					return;
				}
			}
		}

		// On Windows, try JetBrains IDEs via CLI.
		if (isWindows) {
			for (const command of ["phpstorm", "webstorm", "idea"]) {
				if (await checkCommandAvailable(command)) {
					if (await runCommand(`${command} "${normalizedPath}"`)) {
						return;
					}
				}
			}
		}

		// Fallback: open with default application.
		shell.openPath(normalizedPath);
	} else {
		// For files, use shell.openPath which uses OS default application.
		shell.openPath(normalizedPath);
	}
}
