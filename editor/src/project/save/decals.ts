import { join } from "path/posix";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { Mesh, Tools, SceneSerializer } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";
import { isMesh } from "../../tools/guards/nodes";
import { writeBinaryGeometry } from "../tools/geometry";
import { isNodeFromStaticGroup } from "../../tools/node/parenting";

import { Editor } from "../../editor/main";

export interface ISavedMergedDecalsOptions {
	scenePath: string;
	savedFiles: string[];
	relativeScenePath: string;
}

export async function saveMergedDecals(editor: Editor, options: ISavedMergedDecalsOptions) {
	const scene = editor.layout.preview.scene;
	const decalsMap = new Map<string, Mesh[]>();
	const decalsJsonPath = join(options.scenePath, "decals.json");

	let decalsJson: any;
	if (await pathExists(decalsJsonPath)) {
		decalsJson = await readJSON(decalsJsonPath, {
			encoding: "utf-8",
		});
	}

	scene.meshes.forEach((mesh) => {
		if (mesh.metadata.scripts?.length || !isNodeFromStaticGroup(mesh)) {
			return;
		}

		if (mesh.metadata.decal && mesh.material && mesh.material !== scene.defaultMaterial && isMesh(mesh)) {
			if (mesh.metadata.scripts) {
				return;
			}

			const array = decalsMap.get(mesh.material.id) ?? [];
			array.push(mesh);
			decalsMap.set(mesh.material.id, array);
		}
	});

	const meshData = await Promise.all(
		decalsMap.entries().map(async ([materialId, array]) => {
			if (array.length < 2) {
				return null;
			}

			const existingMergedDecal = decalsJson?.find((d) => d.materialId === materialId);

			try {
				const mergedMesh = (await Mesh.MergeMeshesAsync(array, false, true, undefined, false, undefined)) as Mesh;
				mergedMesh.id = existingMergedDecal?.id ?? Tools.RandomId();
				mergedMesh.uniqueId = existingMergedDecal?.uniqueId ?? UniqueNumber.Get();
				mergedMesh.material = array[0].material;
				mergedMesh.isPickable = false;
				mergedMesh.receiveShadows = true;
				mergedMesh.metadata = {
					decal: {},
					isStaticGroup: true,
					mergedMeshesIds: array.map((mesh) => mesh.id),
				};

				const data = await SceneSerializer.SerializeMesh(mergedMesh, false, false);

				const mesh = data.meshes[0];
				const geometry = data.geometries?.vertexData?.find((v) => v.id === mesh.geometryId);

				if (!geometry) {
					return editor.layout.console.warn(`Failed to merge decals "${array[0].name}": geometry not found.`);
				}

				const geometryFileName = `${materialId}_merged_decals.babylonbinarymeshdata`;

				mesh.delayLoadingFile = join(options.relativeScenePath, `geometries/${geometryFileName}`);
				mesh.boundingBoxMaximum = mergedMesh.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
				mesh.boundingBoxMinimum = mergedMesh.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
				mesh._binaryInfo = {};

				const path = join(options.scenePath, "geometries", geometryFileName);

				await writeBinaryGeometry({
					path,
					mesh,
					geometry,
					write: true,
				});

				mergedMesh.dispose(false, false);

				options.savedFiles.push(path);

				return mesh;
			} catch (e) {
				editor.layout.console.error(`Failed to merge decals "${array[0].name}":`);
				editor.layout.console.error(e.message);
			}

			return null;
		})
	);

	if (meshData.length) {
		await writeJSON(
			decalsJsonPath,
			meshData.filter((mesh) => mesh !== null),
			{
				encoding: "utf-8",
			}
		);

		options.savedFiles.push(decalsJsonPath);
	}
}
