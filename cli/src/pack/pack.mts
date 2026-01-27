import fs from "fs-extra";
import { resolve } from "node:path";
import { basename, extname, join } from "node:path/posix";

import ora from "ora";
import cliSpinners from "cli-spinners";

import { normalizedGlob } from "../tools/fs.mjs";
import { locatePVRTexTool } from "../tools/ktx.mjs";
import { ensureSceneDirectories, readSceneDirectories } from "../tools/scene.mjs";

import { createAssets } from "./assets/assets.mjs";
import { createBabylonScene } from "./scene.mjs";
import { createGeometryFiles } from "./geometry.mjs";

export interface IPackOptions {
	optimize: boolean;
}

export async function pack(projectDir: string, options: IPackOptions) {
	const cwd = process.cwd();

	if (projectDir !== cwd) {
		projectDir = resolve(cwd, projectDir);
	}

	projectDir = projectDir.replace(/\\/g, "/");

	// Load project configuration
	const projectFiles = await fs.readdir(projectDir);
	const projectConfigurationFile = projectFiles.find((file) => extname(file).toLowerCase() === ".bjseditor");

	let projectConfiguration = {
		compressedTexturesEnabled: false,
	};

	if (projectConfigurationFile) {
		projectConfiguration = await fs.readJSON(join(projectDir, projectConfigurationFile));
	}

	// Locate PVRTexToolCLI
	if (projectConfiguration.compressedTexturesEnabled) {
		await locatePVRTexTool();
	}

	const assetsDirectory = join(projectDir, "assets");
	const publicDir = join(projectDir, "public/scene");

	await fs.ensureDir(publicDir);

	const baseAssetsDir = join(projectDir, "assets");
	const outputAssetsDir = join(publicDir, "assets");

	await fs.ensureDir(outputAssetsDir);

	const exportedAssets: string[] = [];

	let cache: Record<string, string> = {};
	try {
		cache = await fs.readJSON(join(projectDir, "assets/.export-cache.json"));
	} catch (e) {
		// Catch silently.
	}

	// Pack assets
	const assetsLog = ora(`Packing assets...`);
	assetsLog.spinner = cliSpinners.dots14;
	assetsLog.start();

	await createAssets({
		...options,
		...projectConfiguration,
		cache,
		projectDir,
		publicDir,
		baseAssetsDir,
		outputAssetsDir,
		exportedAssets,
	});

	assetsLog.succeed(`Packed assets`);

	// Get babylonjs-editor-tools version
	let babylonjsEditorToolsVersion = "5.0.0";
	try {
		const pkg = await fs.readJSON(join(projectDir, "node_modules/babylonjs-editor-tools/package.json"));
		babylonjsEditorToolsVersion = pkg.version;
	} catch (e) {
		// Catch silently.
	}

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
			...options,
			...projectConfiguration,
			config,
			directories,
			publicDir,
			sceneFile,
			sceneName,
			exportedAssets,
			babylonjsEditorToolsVersion,
		});

		// Copy geometry files
		await createGeometryFiles({
			directories,
			publicDir,
			sceneFile,
			sceneName,
			exportedAssets,
			babylonjsEditorToolsVersion,
		});

		sceneLog.succeed(`Packed ${sceneFilename}`);
	}

	// Save cache
	await fs.writeJSON(join(projectDir, "assets/.export-cache.json"), cache, {
		encoding: "utf-8",
		spaces: "\t",
	});

	// Clean
	const publicFiles = await normalizedGlob(join(publicDir, "**/*"), {
		nodir: true,
	});

	publicFiles.forEach((file) => {
		if (!exportedAssets.includes(file.toString())) {
			fs.remove(file);
		}
	});
}
