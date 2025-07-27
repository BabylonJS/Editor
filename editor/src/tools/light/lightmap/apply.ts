import { join } from "path/posix";
import { copyFile, pathExists } from "fs-extra";

import { Texture, VertexBuffer, Mesh, Tools, Geometry, SubMesh, LoadAssetContainerAsync, VertexData, Matrix, Vector3, Quaternion } from "babylonjs";

import { Editor } from "../../../editor/main";
import { configureImportedTexture } from "../../../editor/layout/preview/import/import";

import { UniqueNumber } from "../../tools";

import { isInstancedMesh, isMesh } from "../../guards/nodes";
import { isPBRMaterial, isStandardMaterial } from "../../guards/material";

export interface ILightmapApplyOptions {
	assetsOutputFolder: string;
	blenderOutputFolder: string;
	onProgress: (progress: number) => void;
}

export async function applyLightmaps(editor: Editor, options: ILightmapApplyOptions) {
	const scene = editor.layout.preview.scene;

	const container = await LoadAssetContainerAsync("baked_scene.glb", scene, {
		rootUrl: join(options.blenderOutputFolder, "/"),
		onProgress: (event) => options.onProgress(event.lengthComputable ? event.loaded / event.total : 0),
	});

	await Promise.all(
		container.meshes.map(async (mesh) => {
			let existingMesh = scene.getMeshById(mesh.name);
			if (!existingMesh?.geometry) {
				return;
			}

			const lightmapTexture = join(options.blenderOutputFolder, `${mesh.name}_lightmap.png`);
			if (!(await pathExists(lightmapTexture))) {
				return;
			}

			const generatedLightmapPath = join(options.assetsOutputFolder, `${mesh.name}_lightmap.png`);
			await copyFile(lightmapTexture, generatedLightmapPath);

			const indices = mesh.getIndices()?.slice();
			const positions = mesh.getVerticesData(VertexBuffer.PositionKind)?.slice();
			const uv2 = mesh.getVerticesData(VertexBuffer.UV2Kind)?.slice();

			if (!indices || !positions || !uv2) {
				return;
			}

			if (isInstancedMesh(existingMesh) && existingMesh.material) {
				const newMesh = new Mesh(existingMesh.name, scene);
				newMesh.id = Tools.RandomId();
				newMesh.uniqueId = UniqueNumber.Get();

				newMesh.subMeshes ??= [];
				newMesh.receiveShadows = true;

				newMesh.parent = existingMesh.parent;
				newMesh.position = existingMesh.position;
				newMesh.rotation = existingMesh.rotation;
				newMesh.rotationQuaternion = existingMesh.rotationQuaternion;
				newMesh.scaling = existingMesh.scaling;

				const material = existingMesh.material.clone(existingMesh.material.name);
				if (material) {
					material.id = Tools.RandomId();
					material.uniqueId = UniqueNumber.Get();
					newMesh.material = material;
				}

				const geometry = new Geometry(Tools.RandomId(), scene);
				geometry.uniqueId = UniqueNumber.Get();

				geometry.applyToMesh(newMesh);

				const descendants = existingMesh.getDescendants(true);
				descendants.forEach((descendant) => {
					descendant.parent = newMesh;
				});

				existingMesh.dispose(true, false);
				existingMesh = newMesh;
			} else if (existingMesh.material) {
				const existingMaterial = existingMesh.material;
				const material = existingMaterial.clone(existingMaterial.name);
				if (material) {
					material.id = Tools.RandomId();
					material.uniqueId = UniqueNumber.Get();
					existingMesh.material = material;
				}
			}

			if (isMesh(existingMesh)) {
				const lodList = existingMesh.getLODLevels().slice();
				lodList.forEach((lod) => {
					existingMesh.removeLODLevel(lod.mesh);
					lod.mesh?.dispose(true, false);
				});
			}

			const matrix = Matrix.Compose(new Vector3(1, 1, -1), new Quaternion(0, 1, 0, 0), Vector3.Zero());

			VertexData["_TransformVector3Coordinates"](positions, matrix);

			existingMesh.geometry!.setIndices(indices);
			existingMesh.geometry!.setVerticesData(VertexBuffer.PositionKind, positions, true);

			const normals = mesh.getVerticesData(VertexBuffer.NormalKind)?.slice();
			if (normals) {
				VertexData["_TransformVector3Normals"](normals, matrix);
				existingMesh.geometry!.setVerticesData(VertexBuffer.NormalKind, normals, true);
			}

			const tangents = mesh.getVerticesData(VertexBuffer.TangentKind)?.slice();
			if (tangents) {
				VertexData["_TransformVector4Normals"](tangents, matrix);
				existingMesh.geometry!.setVerticesData(VertexBuffer.TangentKind, tangents, true);
			}

			const uvs = mesh.getVerticesData(VertexBuffer.UVKind)?.slice();
			if (uvs) {
				existingMesh.geometry!.setVerticesData(VertexBuffer.UVKind, uvs, true);
			}

			existingMesh.geometry!.setVerticesData(VertexBuffer.UV2Kind, uv2, true);

			existingMesh.subMeshes = [];
			mesh.subMeshes.forEach((subMesh) => {
				new SubMesh(
					subMesh.materialIndex,
					subMesh.verticesStart,
					subMesh.verticesCount,
					subMesh.indexStart,
					subMesh.indexCount,
					existingMesh,
					existingMesh as Mesh,
					true,
					true
				);
			});

			if (existingMesh.material && (isPBRMaterial(existingMesh.material) || isStandardMaterial(existingMesh.material))) {
				const lightmap = configureImportedTexture(new Texture(generatedLightmapPath, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE));
				lightmap.coordinatesIndex = 1;

				existingMesh.material.useLightmapAsShadowmap = true;
				existingMesh.material.lightmapTexture = lightmap;
			}
		})
	);

	container.dispose();
}
