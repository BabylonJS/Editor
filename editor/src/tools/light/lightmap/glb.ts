import { createWriteStream } from "fs";
import { join as nativeJoin } from "path";
import { dirname, join } from "path/posix";
import { copyFile, ensureDir, writeFile, writeJSON } from "fs-extra";

import { GLTF2Export, GLTFData } from "babylonjs-serializers";
import { VertexBuffer, Vector3, Quaternion, BaseTexture, Matrix, AbstractMesh } from "babylonjs";

import { Editor } from "../../../editor/main";

import { projectConfiguration } from "../../../project/configuration";

import { convertPositionToRHS, convertRotationQuaternionToRHS } from "../../maths/rhs";

import { isTexture } from "../../guards/texture";
import { isPBRMaterial, isStandardMaterial } from "../../guards/material";
import { isCollisionInstancedMesh, isCollisionMesh, isLight } from "../../guards/nodes";

export interface ILightmapSerializeGlbsOptions {
	outputFolder: string;
	onGetLog: (log: string) => void;
	onProgress: (progress: number) => void;
}

export async function serializeGlbs(editor: Editor, options: ILightmapSerializeGlbsOptions) {
	options.onGetLog("Preparing meshes and lights...\n");

	const meshesToCompute: AbstractMesh[] = [];

	const scene = editor.layout.preview.scene;

	const copiedTextures: string[] = [];
	const texturesAbsolutePath = join(options.outputFolder, "textures");

	await ensureDir(texturesAbsolutePath);

	const writeStream = (path: string, buffer: Buffer) => {
		const stream = createWriteStream(path);
		stream.write(buffer);

		return new Promise<void>((resolve) => {
			stream.once("close", () => resolve());
			stream.end();
			stream.close();
		});
	};

	let progress = 0;
	const step = 1 / scene.meshes.length;

	await Promise.all(
		scene.meshes.map(async (mesh) => {
			if (!mesh.isEnabled() || !mesh.geometry || mesh._masterMesh || mesh.skeleton || !mesh.material) {
				return;
			}

			if (isCollisionMesh(mesh) || isCollisionInstancedMesh(mesh)) {
				return;
			}

			const material = mesh.material;
			if (!isPBRMaterial(material) && !isStandardMaterial(material)) {
				return;
			}

			const geometry = mesh.geometry;

			const indices = geometry.getIndices()?.slice();
			const positions = geometry.getVerticesData(VertexBuffer.PositionKind)?.slice();

			if (!indices || !positions) {
				return;
			}

			const meshFolder = join(options.outputFolder, mesh.id);
			await ensureDir(meshFolder);

			await writeStream(join(meshFolder, "indices.bin"), Buffer.from(new Uint32Array(indices).buffer));
			await writeStream(join(meshFolder, "positions.bin"), Buffer.from(new Float32Array(positions).buffer));

			const normals = geometry.getVerticesData(VertexBuffer.NormalKind)?.slice();
			if (normals) {
				await writeStream(join(meshFolder, "normals.bin"), Buffer.from(new Float32Array(normals).buffer));
			}

			const uvs = geometry.getVerticesData(VertexBuffer.UVKind)?.slice();
			if (uvs) {
				await writeStream(join(meshFolder, "uvs.bin"), Buffer.from(new Float32Array(uvs).buffer));
			}

			const uv2s = geometry.getVerticesData(VertexBuffer.UV2Kind)?.slice();
			if (uv2s) {
				await writeStream(join(meshFolder, "uv2s.bin"), Buffer.from(new Float32Array(uv2s).buffer));
			}

			const position = Vector3.Zero();
			const rotation = Quaternion.Identity();
			const scaling = Vector3.One();

			const worldMatrix = mesh.computeWorldMatrix(true).multiply(Matrix.RotationAxis(Vector3.Right(), Math.PI * 0.5));

			worldMatrix.decompose(scaling, rotation, position);
			convertPositionToRHS(position);
			convertRotationQuaternionToRHS(rotation).normalize();

			const json = {
				position: position.asArray(),
				rotation: [rotation.w, rotation.x, rotation.y, rotation.z],
				scaling: scaling.asArray(),
				textureUScale: 1,
				textureVScale: 1,
				texture: undefined as string | undefined,
			};

			let texture: BaseTexture | null = null;
			if (isPBRMaterial(material)) {
				texture = material.albedoTexture;
			} else if (isStandardMaterial(material)) {
				texture = material.diffuseTexture;
			}

			material.lightmapTexture?.dispose();
			material.lightmapTexture = null;

			if (texture && isTexture(texture)) {
				const textureAbsolutePath = join(dirname(projectConfiguration.path!), texture.name);
				if (!copiedTextures.includes(textureAbsolutePath)) {
					copiedTextures.push(textureAbsolutePath);
					const textureAbsoluteDestination = join(texturesAbsolutePath, texture.name);

					await ensureDir(dirname(textureAbsoluteDestination));
					await copyFile(textureAbsolutePath, textureAbsoluteDestination);

					json.texture = nativeJoin(texture.name);
					json.textureUScale = texture.uScale;
					json.textureVScale = texture.vScale;
				}
			}

			await writeJSON(join(meshFolder, "mesh.json"), json);

			options.onProgress?.((progress += step));

			meshesToCompute.push(mesh);
		})
	);

	let glb: GLTFData | null = null;

	const savedLightsConfigurations = scene.lights.map((light) => {
		const intensity = light.intensity;
		light.intensity *= 1000;

		return {
			light,
			intensity,
		};
	});

	try {
		glb = await GLTF2Export.GLBAsync(scene, "lights.glb", {
			exportUnusedUVs: true,
			removeNoopRootNodes: false,
			meshCompressionMethod: "None",
			exportWithoutWaitingForScene: true,
			shouldExportAnimation: () => false,
			shouldExportNode: (n) => isLight(n),
		});
	} catch (e) {
		console.error(e);
	}

	savedLightsConfigurations.forEach((configuration) => {
		configuration.light.intensity = configuration.intensity;
	});

	const glbFile = glb?.files["lights.glb"] as Blob;
	if (glbFile) {
		await writeFile(join(options.outputFolder, "lights.glb"), Buffer.from(await glbFile.arrayBuffer()));
	}

	return meshesToCompute;
}
