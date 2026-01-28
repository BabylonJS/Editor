import { resolve } from "node:path";

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
