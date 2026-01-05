import { basename, join } from "path/posix";
import { copyFile, ensureDir, pathExists } from "fs-extra";

import { PBRMaterial, Vector3 } from "babylonjs";
import { Editor, checkProjectCachedCompressedTextures, computeOrGetThumbnail } from "babylonjs-editor";

import { IFabJson } from "../typings";
import { checkAwaitPromises } from "../tools";

import { importMesh } from "./mesh";
import { importMaterial } from "./material";

export interface IImportParameters {
	json: IFabJson;
	finalAssetsFolder: string;

	importMeshes: boolean;
	importMaterials: boolean;

	position?: Vector3;
	meshesPredicate?: (meshFile: string) => boolean;

	onProgress?: (progress: number) => void;
}

export async function importFabJson(editor: Editor, parameters: IImportParameters) {
	const promises: Promise<void>[] = [];
	const materialsMap = new Map<number, PBRMaterial | null>();

	const materialsCount = parameters.importMaterials ? parameters.json.materials.length : 0;
	const meshesCount = parameters.importMeshes ? parameters.json.meshes.length : 0;

	let processedMaterials = 0;
	let processedMeshes = 0;

	const log = await editor.layout.console.progress(`Importing Fab asset.`);

	// Import materials
	if (parameters.importMaterials && !parameters.meshesPredicate) {
		for (let i = 0, len = parameters.json.materials.length; i < len; ++i) {
			await checkAwaitPromises(promises, false);

			const material = parameters.json.materials[i];

			promises.push(
				new Promise<void>(async (resolve) => {
					materialsMap.set(
						i,
						await importMaterial(editor, {
							json: material,
							importMeshes: parameters.importMeshes,
							finalAssetsFolder: parameters.finalAssetsFolder,
						})
					);

					log.setState({
						message: `Processed Fab material: ${material.name}`,
					});

					parameters.onProgress?.((++processedMaterials / materialsCount) * (parameters.importMeshes ? 50 : 100));

					resolve();
				})
			);
		}

		await checkAwaitPromises(promises, true);
	}

	// Import meshes
	for (let i = 0, len = parameters.json.meshes.length; i < len; ++i) {
		const mesh = parameters.json.meshes[i];

		await checkAwaitPromises(promises, false);

		if (mesh.file) {
			if (parameters.meshesPredicate && !parameters.meshesPredicate(mesh.file)) {
				continue;
			}

			const dest = join(parameters.finalAssetsFolder, basename(mesh.file));

			if (!(await pathExists(dest))) {
				await copyFile(mesh.file, dest);
			}

			let overrideMaterialAbsolutePath: string | undefined;
			const material = parameters.json.materials[mesh.material_index];
			if (material) {
				overrideMaterialAbsolutePath = join(parameters.finalAssetsFolder, `${material.name}.material`);
			}

			computeOrGetThumbnail(editor, {
				overrideMaterialAbsolutePath,
				type: "mesh",
				absolutePath: dest,
			});

			if (parameters.importMeshes) {
				if (material && !materialsMap.has(mesh.material_index)) {
					materialsMap.set(
						mesh.material_index,
						await importMaterial(editor, {
							json: material,
							importMeshes: parameters.importMeshes,
							finalAssetsFolder: parameters.finalAssetsFolder,
						})
					);
				}

				promises.push(
					new Promise<void>(async (resolve) => {
						await importMesh(editor, {
							materialsMap,
							json: mesh,
							position: parameters.position,
							finalAssetsFolder: parameters.finalAssetsFolder,
						});

						log.setState({
							message: `Processed Fab mesh: ${basename(mesh.file)}`,
						});

						parameters.onProgress?.(materialsCount + (++processedMeshes / meshesCount) * 50);

						resolve();
					})
				);
			}
		}
	}

	await checkAwaitPromises(promises, true);

	log.setState({
		done: true,
		message: `Processed Fab mesh: ${parameters.json.metadata.fab.listing.title}`,
	});

	// Copy additional textures
	if (!parameters.importMeshes && parameters.json.additional_textures.length) {
		const additionalTexturesDirectory = join(parameters.finalAssetsFolder, "additional_textures");
		await ensureDir(additionalTexturesDirectory);

		await Promise.all(
			parameters.json.additional_textures.map(async (texturePath) => {
				const targetTexturePath = join(additionalTexturesDirectory, basename(texturePath));
				if (!(await pathExists(targetTexturePath))) {
					await copyFile(texturePath, targetTexturePath);
				}
			})
		);
	}

	if (parameters.importMeshes) {
		checkProjectCachedCompressedTextures(editor);
	}
}
