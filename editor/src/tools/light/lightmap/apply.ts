import { join } from "path/posix";
import { copyFile, pathExists, readFile } from "fs-extra";

import { Texture, VertexBuffer, Mesh, Tools, Geometry, SubMesh, AbstractMesh } from "babylonjs";

import { Editor } from "../../../editor/main";
import { configureImportedTexture } from "../../../editor/layout/preview/import/import";

import { UniqueNumber } from "../../tools";

import { isInstancedMesh, isMesh } from "../../guards/nodes";
import { isPBRMaterial, isStandardMaterial } from "../../guards/material";

export interface ILightmapApplyOptions {
	meshesToCompute: AbstractMesh[];
	assetsOutputFolder: string;
	blenderOutputFolder: string;
	onProgress: (progress: number) => void;
}

export async function applyLightmaps(editor: Editor, options: ILightmapApplyOptions) {
	const scene = editor.layout.preview.scene;

	let progress = 0;
	const step = 1 / options.meshesToCompute.length;

	options.onProgress?.(0);

	await Promise.all(
		options.meshesToCompute.map(async (mesh) => {
			const lightmapTexturePath = join(options.blenderOutputFolder, `${mesh.id}_lightmap.png`);
			if (!(await pathExists(lightmapTexturePath))) {
				return;
			}

			const lightmapTextureDestinationPath = join(options.assetsOutputFolder, `${mesh.id}_lightmap.png`);
			await copyFile(lightmapTexturePath, lightmapTextureDestinationPath);

			const indicesBinPath = join(options.blenderOutputFolder, `${mesh.id}_indices.bin`);
			const positionsBinPath = join(options.blenderOutputFolder, `${mesh.id}_positions.bin`);
			const normalsBinPath = join(options.blenderOutputFolder, `${mesh.id}_normals.bin`);
			const uvsBinPath = join(options.blenderOutputFolder, `${mesh.id}_uvs.bin`);
			const uv2sBinPath = join(options.blenderOutputFolder, `${mesh.id}_uv2s.bin`);

			const allExist = await Promise.all([
				pathExists(indicesBinPath),
				pathExists(positionsBinPath),
				pathExists(normalsBinPath),
				pathExists(uvsBinPath),
				pathExists(uv2sBinPath),
			]);

			if (!allExist.every((exists) => exists)) {
				return;
			}

			const [indices, positions, normals, uvs, uv2s] = await Promise.all([
				new Uint32Array((await readFile(indicesBinPath)).buffer),
				new Float32Array((await readFile(positionsBinPath)).buffer),
				new Float32Array((await readFile(normalsBinPath)).buffer),
				new Float32Array((await readFile(uvsBinPath)).buffer),
				new Float32Array((await readFile(uv2sBinPath)).buffer),
			]);

			if (isInstancedMesh(mesh) && mesh.material) {
				const newMesh = new Mesh(mesh.name, scene);
				newMesh.id = Tools.RandomId();
				newMesh.uniqueId = UniqueNumber.Get();

				newMesh.subMeshes ??= [];
				newMesh.receiveShadows = true;

				newMesh.parent = mesh.parent;
				newMesh.position = mesh.position;
				newMesh.rotation = mesh.rotation;
				newMesh.rotationQuaternion = mesh.rotationQuaternion;
				newMesh.scaling = mesh.scaling;

				const material = mesh.material.clone(mesh.material.name);
				if (material) {
					material.id = Tools.RandomId();
					material.uniqueId = UniqueNumber.Get();
					newMesh.material = material;
				}

				const geometry = new Geometry(Tools.RandomId(), scene);
				geometry.uniqueId = UniqueNumber.Get();

				geometry.applyToMesh(newMesh);

				const descendants = mesh.getDescendants(true);
				descendants.forEach((descendant) => {
					descendant.parent = newMesh;
				});

				mesh.dispose(true, false);
				mesh = newMesh;
			} else if (mesh.material) {
				const existingMaterial = mesh.material;
				const material = existingMaterial.clone(existingMaterial.name);
				if (material) {
					material.id = Tools.RandomId();
					material.uniqueId = UniqueNumber.Get();
					mesh.material = material;
				}
			}

			if (isMesh(mesh)) {
				const lodList = mesh.getLODLevels().slice();
				lodList.forEach((lod) => {
					mesh.removeLODLevel(lod.mesh);
					lod.mesh?.dispose(true, false);
				});
			}

			const verticesCount = positions.length / 3;

			console.log(mesh.name, mesh.geometry!.getIndices()?.length, indices.length);

			mesh.geometry!.setIndices(indices, verticesCount, false);
			mesh.geometry!.setVerticesData(VertexBuffer.PositionKind, positions, false);
			mesh.geometry!.setVerticesData(VertexBuffer.NormalKind, normals, false);
			mesh.geometry!.setVerticesData(VertexBuffer.UVKind, uvs, false);
			mesh.geometry!.setVerticesData(VertexBuffer.UV2Kind, uv2s, false);

			mesh.subMeshes = [];
			new SubMesh(0, 0, verticesCount, 0, indices.length, mesh, mesh as Mesh, true, true);

			if (mesh.material && (isPBRMaterial(mesh.material) || isStandardMaterial(mesh.material))) {
				const lightmap = configureImportedTexture(new Texture(lightmapTextureDestinationPath, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE));
				lightmap.coordinatesIndex = 1;

				mesh.material.useLightmapAsShadowmap = true;
				mesh.material.lightmapTexture = lightmap;
			}

			options.onProgress?.((progress += step));
		})
	);
}
