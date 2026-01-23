import { extname, join } from "node:path/posix";

import fs from "fs-extra";

import { normalizedGlob } from "../../tools/fs.mjs";

import { processAssetFile } from "./process.mjs";

export interface ICreateAssetsParams {
	projectDir: string;
	publicDir: string;
}

export async function createAssets(options: ICreateAssetsParams) {
	const baseAssetsDir = join(options.projectDir, "assets");
	const outputAssetsDir = join(options.publicDir, "assets");

	await fs.ensureDir(outputAssetsDir);

	const files = await normalizedGlob(join(baseAssetsDir, "**/*"), {
		nodir: true,
		ignore: {
			childrenIgnored: (p) => extname(p.name) === ".scene",
		},
	});

	const promises: Promise<void>[] = [];
	const exportedAssets: string[] = [];

	let cache: Record<string, string> = {};
	try {
		cache = await fs.readJSON(join(options.projectDir, "assets/.export-cache.json"));
	} catch (e) {
		// Catch silently.
	}

	for (const file of files) {
		if (promises.length >= 5) {
			await Promise.all(promises);
			promises.length = 0;
		}

		promises.push(
			processAssetFile(file, {
				...options,
				cache,
				outputAssetsDir,
				exportedAssets,
			})
		);
	}

	await Promise.all(promises);

	// Clean
	const publicFiles = await normalizedGlob(join(outputAssetsDir, "**/*"), {
		nodir: true,
	});

	publicFiles.forEach((file) => {
		if (!exportedAssets.includes(file.toString())) {
			fs.remove(file);
		}
	});
}
