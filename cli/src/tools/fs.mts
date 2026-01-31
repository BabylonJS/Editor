import { resolve } from "node:path";

import fs from "fs-extra";
import { glob } from "glob";

export async function normalizedGlob(...args: Parameters<typeof glob>) {
	const result = await glob(...args);

	result.forEach((_: unknown, index: number) => {
		result[index] = result[index].toString().replace(/\\/g, "/");
	});

	return result as string[];
}

export function getProjectDir(projectDir: string) {
	const cwd = process.cwd();

	if (projectDir !== cwd) {
		projectDir = resolve(cwd, projectDir);
	}

	projectDir = projectDir.replace(/\\/g, "/");

	return projectDir;
}

/**
 * Tries to read a directory and returns its content if the directory exists.
 * If not, returns an empty array.
 * @param path defines the absolute path to read directory.
 */
export async function tryReadDir(path: string) {
	if (await fs.pathExists(path)) {
		return fs.readdir(path);
	}

	return [];
}
