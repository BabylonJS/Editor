import fs from "fs-extra";
import { basename, extname, join } from "node:path/posix";

import ora from "ora";
import cliSpinners from "cli-spinners";

import { getProjectDir, normalizedGlob } from "../tools/fs.mjs";
import { locatePVRTexTool, setPVRTexToolAbsolutePath } from "../tools/ktx.mjs";
import { ensureSceneDirectories, readSceneDirectories } from "../tools/scene.mjs";

import { createAssets } from "./assets/assets.mjs";
import { createBabylonScene } from "./scene.mjs";
import { createGeometryFiles } from "./geometry.mjs";

export type PackStepType = "assets" | "scenes" | "upload";

export interface IPackStepDetails {
	message?: string;
	success?: boolean;
}

export interface IPackOptions {
	optimize: boolean;
	pvrTexToolAbsolutePath?: string;

	onStepChanged?: (step: PackStepType, detail?: IPackStepDetails) => void;
}

export async function pack(projectDir: string, options: IPackOptions) {
	projectDir = getProjectDir(projectDir);

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
		if (options.pvrTexToolAbsolutePath) {
			setPVRTexToolAbsolutePath(options.pvrTexToolAbsolutePath);
		} else {
			await locatePVRTexTool();
		}
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
	const assetsLog = ora("Packing assets...");
	assetsLog.spinner = cliSpinners.dots14;
	assetsLog.start();

	options.onStepChanged?.("assets", {
		message: "Packing assets...",
	});

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

	assetsLog.succeed("Packed assets");
	options.onStepChanged?.("assets", {
		success: true,
		message: "Packed assets",
	});

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

		options.onStepChanged?.("scenes", {
			message: `Packing scene ${sceneName}...`,
		});

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

		options.onStepChanged?.("scenes", {
			message: `Packing scene ${sceneName} geometries...`,
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

	options.onStepChanged?.("scenes", {
		success: true,
		message: "Packed scenes",
	});

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
