import fs from "fs-extra";
import { resolve } from "node:path";
import { basename, extname, join } from "node:path/posix";

import ora from "ora";
import cliSpinners from "cli-spinners";

import { normalizedGlob } from "../tools/fs.mjs";
import { ensureSceneDirectories, readSceneDirectories } from "../tools/scene.mjs";

import { createAssets } from "./assets.mjs";
import { createBabylonScene } from "./scene.mjs";
import { createGeometryFiles } from "./geometry.mjs";

export async function pack(projectDir: string) {
	const cwd = process.cwd();

	if (projectDir !== cwd) {
		projectDir = resolve(cwd, projectDir);
	}

	projectDir = projectDir.replace(/\\/g, "/");

	const assetsDirectory = join(projectDir, "assets");
	const publicDir = join(projectDir, "public/scene");

	await fs.ensureDir(publicDir);

	// Pack assets
	const assetsLog = ora(`Packing assets...`);
	assetsLog.spinner = cliSpinners.dots14;
	assetsLog.start();

	await createAssets({
		projectDir,
		publicDir,
	});

	assetsLog.succeed(`Packed assets`);

	// Pack scenes
	const sceneFiles = await normalizedGlob(`${assetsDirectory}/**/*`, {
		nodir: false,
		ignore: {
			ignored: (p) => !p.isDirectory() || extname(p.name).toLocaleLowerCase() !== ".scene",
		},
	});

	for (const sceneFile of sceneFiles) {
		const sceneFilename = basename(sceneFile);
		const sceneName = basename(sceneFile, extname(sceneFile));

		const sceneLog = ora(`Packing ${sceneFilename}...`);
		sceneLog.spinner = cliSpinners.dots14;
		sceneLog.start();

		await ensureSceneDirectories(sceneFile);

		const directories = await readSceneDirectories(sceneFile);
		const config = await fs.readJSON(join(sceneFile, "config.json"));

		await createBabylonScene({
			config,
			directories,
			publicDir,
			sceneFile,
			sceneName,
		});

		// Copy geometry files
		await createGeometryFiles({
			directories,
			publicDir,
			sceneFile,
			sceneName,
		});

		sceneLog.succeed(`Packed ${sceneFilename}`);
	}
}
