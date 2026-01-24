import { join } from "path/posix";
import { readJSON, writeJSON } from "fs-extra";

import { createDirectoryIfNotExist } from "../../tools/fs";
import { extractNodeMaterialTextures } from "../../tools/material/extract";

import { Editor } from "../../editor/main";

import { compressFileToKtx } from "./ktx";

export function configureMaterials(data: any) {
	if (!data.materials) {
		return;
	}

	data.materials = data.materials.filter((material: any) => {
		if (material.customType === "BABYLON.ShaderMaterial") {
			return false;
		}

		return true;
	});
}

export type ComputeExportedMaterialOptions = {
	force: boolean;
	scenePath: string;
	exportedAssets: string[];
};

export async function processExportedMaterial(editor: Editor, absolutePath: string, options: ComputeExportedMaterialOptions) {
	const materialData = await readJSON(absolutePath);
	if (materialData.customType !== "BABYLON.NodeMaterial") {
		return;
	}

	const extractedTexturesOutputPath = join(options.scenePath, "assets", "editor-generated_extracted-textures");

	await createDirectoryIfNotExist(extractedTexturesOutputPath);

	const relativePaths = await extractNodeMaterialTextures(editor, {
		materialData,
		assetsDirectory: join(options.scenePath, "assets", "editor-generated_extracted-textures"),
	});

	await writeJSON(absolutePath, materialData, {
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
