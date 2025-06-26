import { platform } from "os";
import { exec } from "child_process";

import { EditorProjectPackageManager } from "../project/typings";

import { execNodePty } from "./node-pty";

/**
 * Get the file path argument from the command line arguments.
 * @param argv The command line arguments.
 * @returns The file path argument or null if none was found.
 */
export function getFilePathArgument(argv?: string[] | null): string | null {
	if (!argv) {
		return null;
	}

	let index = (platform() === "darwin") ? 2 : 2;
	while (index < argv.length && argv[index].startsWith('--')) {
		index += 1;
	}

	return index < argv.length ? argv[index] : null;
}

/**
 * Executes the given command asynchronously using `child_process`
 * @param command defines the command to execute.
 */
export function executeAsync(command: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(command, stderr);
				reject(error);
			} else {
				console.log(command, stdout);
				resolve();
			}
		});
	});
}

export let nodeJSAvailable: boolean = false;
export let packageManagerAvailable: boolean = false;
export let visualStudioCodeAvailable: boolean = false;

/**
 * Checks wether or not Node.js is available on the system.
 * Updates the `nodeJSAvailable` variable that can be imported from this file.
 */
export async function checkNodeJSAvailable(): Promise<void> {
	try {
		const p = await execNodePty("node --version");
		const code = await p.wait();

		if (code === 0) {
			nodeJSAvailable = true;
		}
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Checks wether or not Visual Studio Code is available on the system.
 * Updates the `visualStudioCodeAvailable` variable that can be imported from this file.
 */
export async function checkVisualStudioCodeAvailable(): Promise<void> {
	try {
		const p = await execNodePty("code --version");
		const code = await p.wait();

		if (code === 0) {
			visualStudioCodeAvailable = true;
		}
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Checks wether or not the used package manager (yarn, npm, etc.) is available on the system.
 * Updates the `packageManagerAvailable` variable that can be imported from this file.
 * @param packageManager The package manager to check for availability.
 */
export async function checkPackageManagerAvailable(packageManager: EditorProjectPackageManager): Promise<void> {
	if (packageManagerAvailable) {
		return;
	}

	try {
		let command = "";
		switch (packageManager) {
		case "npm": command = "npm -v"; break;
		case "pnpm": command = "pnpm -v"; break;
		case "bun": command = "bun -v"; break;
		default: command = "yarn -v"; break;
		}

		const p = await execNodePty(command);
		const code = await p.wait();

		if (code === 0) {
			packageManagerAvailable = true;
		}
	} catch (e) {
		// Catch silently.
	}
}
