import { join } from "path/posix";
import { writeFile } from "fs-extra";

import { GLTF2Export, GLTFData } from "babylonjs-serializers";
import { Mesh, Light, VertexBuffer, Vector3, Quaternion, Node, PBRMaterial, StandardMaterial } from "babylonjs";

import { Editor } from "../../../editor/main";

import { isPBRMaterial, isStandardMaterial } from "../../guards/material";
import { isAbstractMesh, isCollisionInstancedMesh, isCollisionMesh, isLight, isMesh } from "../../guards/nodes";

export interface ILightmapSerializeGlbsOptions {
	outputFolder: string;
	onGetLog: (log: string) => void;
}

export async function serializeGlbs(editor: Editor, options: ILightmapSerializeGlbsOptions) {
	options.onGetLog("Preparing meshes and lights...\n");

	const scene = editor.layout.preview.scene;

	const entities = [...scene.lights, ...scene.materials] as (PBRMaterial | StandardMaterial | Light)[];

	const modifiedLights: Light[] = [];
	const modifiedMeshes: {
		mesh: Mesh;
		parent: Node | null;
		position: Vector3;
		rotation: Vector3;
		rotationQuaternion: Quaternion | null;
		scaling: Vector3;
		name: string;
	}[] = [];

	let meshesToComputeCount = 0;
	const entitiesToInclude: Node[] = [];

	entities.forEach((entity) => {
		if (isLight(entity) && entity.isEnabled(true)) {
			modifiedLights.push(entity);
			entitiesToInclude.push(entity);
			entity.intensity *= 1000;
		}

		if (isPBRMaterial(entity) || isStandardMaterial(entity)) {
			const bindedMeshes = entity.getBindedMeshes();

			bindedMeshes.forEach((mesh) => {
				if (!mesh.isEnabled(true) || !mesh.geometry || mesh._masterMesh || mesh.skeleton) {
					return;
				}

				if (isCollisionMesh(mesh) || isCollisionInstancedMesh(mesh)) {
					return;
				}

				entity.lightmapTexture?.dispose();
				entity.lightmapTexture = null;

				entitiesToInclude.push(mesh);
				++meshesToComputeCount;

				if (isMesh(mesh)) {
					mesh.geometry.removeVerticesData(VertexBuffer.UV2Kind);
					entitiesToInclude.push(...mesh.instances);
					meshesToComputeCount += mesh.instances.length;
				}

				entitiesToInclude.forEach((node) => {
					if (!isAbstractMesh(node)) {
						return;
					}

					if (modifiedMeshes.find((m) => m.mesh === node) || !scene.meshes.includes(node)) {
						return;
					}

					modifiedMeshes.push({
						mesh: node,
						name: node.name,
						parent: node.parent,
						position: node.position.clone(),
						rotation: node.rotation.clone(),
						rotationQuaternion: node.rotationQuaternion?.clone() ?? null,
						scaling: node.scaling.clone(),
					});

					node.name = node.id;

					const matrix = node.computeWorldMatrix(true).clone();

					node.parent = null;
					node.rotation.setAll(0);
					node.rotationQuaternion ??= Quaternion.Identity();

					matrix.decompose(node.scaling, node.rotationQuaternion, node.position, undefined, true);
					node.computeWorldMatrix(true);
				});
			});
		}
	});

	let glb: GLTFData | null = null;

	try {
		glb = await GLTF2Export.GLTFAsync(scene, "lightmap.gltf", {
			exportUnusedUVs: true,
			removeNoopRootNodes: false,
			meshCompressionMethod: "None",
			exportWithoutWaitingForScene: true,
			shouldExportAnimation: () => false,
			shouldExportNode: (n) => entitiesToInclude.includes(n),
		});
	} catch (e) {
		console.error(e);
	}

	const gltfFile = glb?.files["lightmap.gltf"] as string;
	const gltfBinaryFile = glb?.files["lightmap.bin"] as Blob;

	const writePromises: Promise<void>[] = [];

	if (gltfFile && gltfBinaryFile) {
		writePromises.push(
			writeFile(join(options.outputFolder, "lightmap.gltf"), gltfFile),
			writeFile(join(options.outputFolder, "lightmap.bin"), Buffer.from(await gltfBinaryFile.arrayBuffer()))
		);

		for (const fileName in glb!.files) {
			if (fileName === "lightmap.gltf" || fileName === "lightmap.bin") {
				continue;
			}

			const blob = glb!.files[fileName] as Blob;
			writePromises.push(writeFile(join(options.outputFolder, fileName), Buffer.from(await blob.arrayBuffer())));
		}
	}

	await Promise.all(writePromises);

	modifiedLights.forEach((modifiedLight) => {
		modifiedLight.intensity /= 1000;
	});

	modifiedMeshes.forEach((configuration) => {
		configuration.mesh.name = configuration.name;
		configuration.mesh.parent = configuration.parent;
		configuration.mesh.position.copyFrom(configuration.position);
		configuration.mesh.rotation.copyFrom(configuration.rotation);
		configuration.mesh.rotationQuaternion = configuration.rotationQuaternion;
		configuration.mesh.scaling.copyFrom(configuration.scaling);
		configuration.mesh.computeWorldMatrix(true);
	});

	return meshesToComputeCount;
}
