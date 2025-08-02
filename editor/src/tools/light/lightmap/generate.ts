import { join as nativeJoin } from "path";
import { dirname, join } from "path/posix";
import { ensureDir, remove } from "fs-extra";

import { Editor } from "../../../editor/main";

import { projectConfiguration } from "../../../project/configuration";

import { CancellationToken } from "../../tools";

import { ensureTemporaryDirectoryExists } from "../../project";

import { serializeGlbs } from "./glb";
import { applyLightmaps } from "./apply";
import { executeBlender } from "./blender";

export type LightmapGenerationQuality = "low" | "medium" | "high" | "preview";

export interface IGenrateLightmapOptions {
	quality: LightmapGenerationQuality;
	cancellationToken: CancellationToken;

	onGetLog: (log: string) => void;
	onProgress: (step: string, progress: number) => void;
}

export async function generateLightmaps(editor: Editor, options: IGenrateLightmapOptions) {
	if (!projectConfiguration.path || !editor.path) {
		return;
	}

	// Create temp directory
	const tempDirectory = await ensureTemporaryDirectoryExists(projectConfiguration.path);

	const lightmapTempDirectory = join(tempDirectory, "lightmap");
	const blenderOutputFolder = join(tempDirectory, "lightmap/lightmap.glb");

	const assetsOutputFolder = join(dirname(projectConfiguration.path), "assets/lightmaps");
	await ensureDir(assetsOutputFolder);

	try {
		await remove(lightmapTempDirectory);
	} catch (e) {
		// Catch silently.
	}

	await ensureDir(lightmapTempDirectory);

	// Generate temp GLBs
	const meshesToCompute = await serializeGlbs(editor, {
		outputFolder: join(tempDirectory, "lightmap"),
		onGetLog: (log) => options.onGetLog(log),
		onProgress: (p) => options.onProgress("Preparing scene...", p),
	});

	if (options.cancellationToken?.isCancelled) {
		return;
	}

	// Execute blender
	// const pythonPath = process.env.DEBUG
	// 	? join(editor.path, "assets/scripts/blender_generate_lightmaps.py")
	// 	: join(editor.path, "../../assets/scripts/blender_generate_lightmaps.py");
	const pythonPath = process.env.DEBUG ? nativeJoin(editor.path, "assets/scripts/main.py") : nativeJoin(editor.path, "../../assets/scripts/main.py");

	const command = `--background --python "${pythonPath}" -- "${nativeJoin(tempDirectory, "lightmap")}" "${nativeJoin(blenderOutputFolder)}" ${options.quality}`;

	await executeBlender(editor, {
		command,
		meshesToComputeCount: meshesToCompute.length,
		cancellationToken: options.cancellationToken,
		onGetLog: (log) => options.onGetLog(log),
		onProgress: (p) => options.onProgress("Baking lightmaps...", p),
	});

	if (options.cancellationToken?.isCancelled) {
		return;
	}

	// Apply lightmaps
	try {
		await applyLightmaps(editor, {
			meshesToCompute,
			assetsOutputFolder,
			blenderOutputFolder,
			onProgress: (p) => options.onProgress("Applying lightmaps...", p),
		});
	} catch (e) {
		console.error("Failed to apply lightmaps:", e);
	}
}
