import { cpus } from "node:os";
import { extname, join } from "node:path/posix";

import { normalizedGlob } from "../../tools/fs.mjs";

import { processAssetFile } from "./process.mjs";

export interface ICreateAssetsOptions {
	projectDir: string;
	publicDir: string;
	baseAssetsDir: string;
	outputAssetsDir: string;
	optimize: boolean;
	exportedAssets: string[];
	cache: Record<string, string>;
}

export async function createAssets(options: ICreateAssetsOptions) {
	const files = await normalizedGlob(join(options.baseAssetsDir, "**/*"), {
		nodir: true,
		ignore: {
			childrenIgnored: (p) => extname(p.name) === ".scene",
		},
	});

	const promises: Promise<void>[] = [];

	const cpusCount = cpus().length;
	console.log(`Using ${cpusCount} cpus to process assets...`);

	for (const file of files) {
		if (promises.length >= cpusCount) {
			await Promise.all(promises);
			promises.length = 0;
		}

		promises.push(
			processAssetFile(file, {
				...options,
			})
		);
	}

	await Promise.all(promises);
}
