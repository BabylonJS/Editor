import { Scene } from "babylonjs";
import { readJSON, writeJSON } from "fs-extra";
import { Editor } from "../../editor/main";
import { join } from "path/posix";
import { extractNodeParticleSystemSetTextures } from "../../tools/particles/extract";
import { compressFileToKtx } from "./ktx";

export function configureParticleSystems(data: any, scene: Scene) {
	if (!data.particleSystems) {
		return;
	}

	data.particleSystems = data.particleSystems.filter((ps: any) => {
		const existing = scene.getParticleSystemById(ps.id);
		if (existing?.isNodeGenerated) {
			return false;
		}

		return true;
	});
}

export type ProcessExportedParticleSystemOptions = {
	force: boolean;
	scenePath: string;
	exportedAssets: string[];
};

export async function processExportedNodeParticleSystemSet(editor: Editor, absolutePath: string, options: ProcessExportedParticleSystemOptions) {
	const particlesData = await readJSON(absolutePath);
	if (particlesData.customType !== "BABYLON.NodeParticleSystemSet") {
		return;
	}

	const assetsDirectory = join(options.scenePath, "assets", "editor-generated_extracted-textures");

	const relativePaths = await extractNodeParticleSystemSetTextures(editor, {
		particlesData,
		assetsDirectory,
	});

	await writeJSON(absolutePath, particlesData, {
		encoding: "utf-8",
	});

	await Promise.all(
		relativePaths.map(async (relativePath) => {
			const finalPath = join(options.scenePath, relativePath);

			options.exportedAssets.push(finalPath);

			await compressFileToKtx(editor, finalPath, {
				force: options.force,
				exportedAssets: options.exportedAssets,
			});
		})
	);
}
