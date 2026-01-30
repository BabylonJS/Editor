import { basename, extname, join } from "node:path/posix";

import fs from "fs-extra";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import ora from "ora";
import chalk from "chalk";
import cliSpinners from "cli-spinners";

import { pack, IPackOptions } from "../pack/pack.mjs";

import { executeSimpleWorker } from "../tools/worker.mjs";
import { getProjectDir, normalizedGlob } from "../tools/fs.mjs";

export interface IS3Options extends Partial<IPackOptions> {
	noPack?: boolean;

	maxConnections?: number;

	region?: string;
	endpoint?: string;

	accessKeyId?: string;
	secretAccessKey?: string;

	rootKey?: string;
}

export async function s3(projectDir: string, options: IS3Options) {
	const region = options.region ?? process.env.SPACE_REGION;
	if (!region) {
		throw new Error("SPACE_REGION is not defined in environment variables.");
	}

	const endpoint = options.endpoint ?? process.env.SPACE_END_POINT;
	if (!endpoint) {
		throw new Error("SPACE_END_POINT is not defined in environment variables.");
	}

	const accessKeyId = options.accessKeyId ?? process.env.SPACE_KEY;
	if (!accessKeyId) {
		throw new Error("SPACE_KEY is not defined in environment variables.");
	}

	const secretAccessKey = options.secretAccessKey ?? process.env.SPACE_SECRET;
	if (!secretAccessKey) {
		throw new Error("SPACE_SECRET is not defined in environment variables.");
	}

	const rootKey = options.rootKey ?? process.env.SPACE_ROOT_KEY;
	if (!rootKey) {
		throw new Error("SPACE_ROOT_KEY is not defined in environment variables and no rootKey option was provided.");
	}

	projectDir = getProjectDir(projectDir);

	if (!options.noPack) {
		await pack(projectDir, {
			...options,
			optimize: options.optimize ?? false,
		});
	}

	const client = new S3Client({
		region,
		endpoint,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});

	const sceneFolder = join(projectDir, "public/scene");
	const files = await normalizedGlob(`${sceneFolder}/**/*.*`, {
		nodir: true,
	});

	const promises: Promise<void>[] = [];
	const maxConnections = options.maxConnections ?? 10;

	const assetsLog = ora("Uploading assets...");
	assetsLog.spinner = cliSpinners.dots14;
	assetsLog.start();

	options.onStepChanged?.("upload", {
		message: "Checking assets...",
	});

	const step = 100 / files.length;

	let currentStep = 0;
	let errorsCount = 0;

	let cache: Record<string, string> = {};
	try {
		cache = await fs.readJSON(join(projectDir, "assets/.s3-cache.json"));
	} catch (e) {
		// Catch silently.
	}

	function notifyStep() {
		currentStep += step;

		options.onProgress?.(currentStep);
		assetsLog.text = `Uploading assets... ${currentStep.toFixed(2)}%`;
	}

	for (const file of files) {
		if (promises.length >= maxConnections) {
			await Promise.all(promises);
			promises.splice(0, promises.length);
		}

		const relativeFilePath = file.replace(`${sceneFolder}/`, "");
		const s3Key = join(rootKey, relativeFilePath);

		// Upload
		promises.push(
			new Promise<void>(async (resolve) => {
				// Check if already uploaded
				const fileStat = await fs.stat(file);

				let hash = fileStat.mtimeMs.toString();
				if (cache[relativeFilePath] && cache[relativeFilePath] === hash) {
					notifyStep();
					return resolve();
				}

				const fileContent = await fs.readFile(file);

				const extension = extname(relativeFilePath).toLowerCase();
				if (extension === ".babylonbinarymeshdata" || extension === ".babylon") {
					hash = await executeSimpleWorker("workers/md5.mjs", fileContent);
					if (cache[relativeFilePath] && cache[relativeFilePath] === hash) {
						notifyStep();
						return resolve();
					}
				}

				try {
					await client.send(
						new PutObjectCommand({
							Key: s3Key,
							Body: fileContent,
							Bucket: "babylonjs-editor",
							ContentType: "application/octet-stream",
						})
					);

					options.onStepChanged?.("upload", {
						message: `Successfully uploaded ${basename(file)}.`,
					});

					console.log(`${chalk.green("Successfully")} uploaded ${s3Key}.`);
					cache[relativeFilePath] = hash;
				} catch (e) {
					errorsCount++;
					console.error(`${chalk.red("Failed")} to upload ${s3Key} to S3 bucket`);
					console.error(e);
				}

				notifyStep();
				resolve();
			})
		);
	}

	await Promise.all(promises);

	if (errorsCount > 0) {
		assetsLog.fail(`Uploaded assets with ${errorsCount} errors.`);
	} else {
		assetsLog.succeed("Uploaded all assets successfully.");
	}

	options.onStepChanged?.("upload", {
		success: true,
		message: "Uploaded all assets successfully.",
	});

	// Save cache
	await fs.writeJSON(join(projectDir, "assets/.s3-cache.json"), cache, {
		encoding: "utf-8",
		spaces: "\t",
	});
}
