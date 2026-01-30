import { cpus } from "node:os";
import { extname, join } from "node:path/posix";

import { normalizedGlob } from "../../tools/fs.mjs";

import { IPackOptions } from "../pack.mjs";

import { processAssetFile } from "./process.mjs";

export interface ICreateAssetsOptions extends IPackOptions {
	projectDir: string;
	publicDir: string;
	baseAssetsDir: string;
	outputAssetsDir: string;
	optimize: boolean;
	exportedAssets: string[];
	cache: Record<string, string>;
	compressedTexturesEnabled: boolean;
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

	const step = 100 / files.length;
	let currentStep = 0;

	for (const file of files) {
		if (promises.length >= cpusCount) {
			await Promise.all(promises);
			promises.length = 0;
		}

		if (options.cancellationToken?.isCanceled) {
			break;
		}

		promises.push(
			new Promise<void>(async (resolve) => {
				await processAssetFile(file, {
					...options,
				});

				options.onProgress?.((currentStep += step));

				resolve();
			})
		);
	}

	await Promise.all(promises);
}
