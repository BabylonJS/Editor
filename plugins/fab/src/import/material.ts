import sharp, { Sharp } from "sharp";
import { join } from "path/posix";
import { ensureDir, pathExists, readJSON, writeJSON } from "fs-extra";

import { PBRMaterial, Texture } from "babylonjs";
import { configureImportedMaterial, configureImportedTexture, Editor, getProjectAssetsRootUrl } from "babylonjs-editor";

import { IFabMaterialJson } from "../typings";

export interface IImportMaterialParameters {
	json: IFabMaterialJson;
	importMeshes: boolean;
	finalAssetsFolder: string;
}

export async function importMaterial(editor: Editor, parameters: IImportMaterialParameters) {
	const materialFilePath = join(parameters.finalAssetsFolder, `${parameters.json.name}.material`);
	if (await pathExists(materialFilePath)) {
		if (!parameters.importMeshes) {
			return null;
		}

		const data = await readJSON(materialFilePath);
		const material = PBRMaterial.Parse(data, editor.layout.preview.scene, getProjectAssetsRootUrl()!);

		material.id = data.id;
		material.uniqueId = data.uniqueId;

		return material;
	}

	const material = new PBRMaterial(parameters.json.name, editor.layout.preview.scene);
	material.useRoughnessFromMetallicTextureAlpha = false;

	configureImportedMaterial(material);

	const albedo = parameters.json.textures.albedo ? sharp(parameters.json.textures.albedo) : null;
	const normal = parameters.json.textures.normal ? sharp(parameters.json.textures.normal) : null;
	const opacity = parameters.json.textures.opacity ? sharp(parameters.json.textures.opacity) : null;

	const roughness = parameters.json.textures.roughness ? sharp(parameters.json.textures.roughness) : null;
	const metal = parameters.json.textures.metal ? sharp(parameters.json.textures.metal) : null;
	const occlusion = parameters.json.textures.occlusion ? sharp(parameters.json.textures.occlusion) : null;

	const orm = parameters.json.textures.orm ? sharp(parameters.json.textures.orm) : null;

	await ensureDir(join(parameters.finalAssetsFolder, "textures"));

	const albedoPath = join(parameters.finalAssetsFolder, `textures/${parameters.json.name}_albedo.jpg`);
	const bumpPath = join(parameters.finalAssetsFolder, `textures/${parameters.json.name}_bump.png`);
	const albedoOpacityPath = join(parameters.finalAssetsFolder, `textures/${parameters.json.name}_albedo_opacity.png`);

	const occlusionPath = join(parameters.finalAssetsFolder, `textures/${parameters.json.name}_occlusion.jpg`);

	const ormPath = join(parameters.finalAssetsFolder, `textures/${parameters.json.name}_orm.jpg`);

	if (albedo && opacity) {
		material.useAlphaFromAlbedoTexture = true;
		material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;

		const metadata = await albedo.metadata();

		const albedoBuffer = await albedo.raw().toBuffer();
		const opacityBuffer = await opacity.toColourspace("b-w").raw().toBuffer();

		const rgbaBuffer = Buffer.alloc(metadata!.width * metadata!.height * 4);

		for (let i = 0; i < metadata!.width * metadata!.height; i++) {
			rgbaBuffer[i * 4 + 0] = albedoBuffer[i * 3 + 0];
			rgbaBuffer[i * 4 + 1] = albedoBuffer[i * 3 + 1];
			rgbaBuffer[i * 4 + 2] = albedoBuffer[i * 3 + 2];
			rgbaBuffer[i * 4 + 3] = opacityBuffer[i];
		}

		await sharp(rgbaBuffer, {
			raw: {
				width: metadata!.width,
				height: metadata!.height,
				channels: 4,
			},
		})
			.png()
			.toFile(albedoOpacityPath);

		const texture = new Texture(albedoOpacityPath, editor.layout.preview.scene);
		material.albedoTexture = texture;

		configureImportedTexture(texture, false);
	} else if (albedo) {
		await albedo.toFile(albedoPath);

		const texture = new Texture(albedoPath, editor.layout.preview.scene);
		material.albedoTexture = texture;

		configureImportedTexture(texture, false);
	}

	if (normal) {
		await downscaleTexture(normal);
		await normal.toFile(bumpPath);

		const texture = new Texture(bumpPath, editor.layout.preview.scene);
		material.bumpTexture = texture;

		configureImportedTexture(texture, false);
	}

	if (orm) {
		await downscaleTexture(orm);
		await orm.toFile(ormPath);

		const texture = new Texture(ormPath, editor.layout.preview.scene);
		material.metallicTexture = texture;
		material.useMetallnessFromMetallicTextureBlue = true;
		material.useRoughnessFromMetallicTextureGreen = true;
		material.useAmbientOcclusionFromMetallicTextureRed = true;

		material.metallic = 1;
		material.roughness = 1;

		configureImportedTexture(texture, false);
	} else if (metal || roughness) {
		material.metallic = 0;
		material.roughness = 0;

		const metadata = await (metal?.metadata() ?? roughness?.metadata());

		const channels: Buffer[] = [];

		if (occlusion) {
			material.useAmbientOcclusionFromMetallicTextureRed = true;
			channels.push(await occlusion.ensureAlpha().removeAlpha().toColourspace("b-w").raw().toBuffer());
		}

		if (roughness) {
			material.roughness = 1;
			material.useRoughnessFromMetallicTextureGreen = true;
			channels.push(await roughness.ensureAlpha().removeAlpha().toColourspace("b-w").raw().toBuffer());
		}

		if (metal) {
			material.metallic = 1;
			material.useMetallnessFromMetallicTextureBlue = true;
			channels.push(await metal.ensureAlpha().removeAlpha().toColourspace("b-w").raw().toBuffer());
		}

		const ormBuffer = Buffer.alloc(metadata!.width * metadata!.height * 3);
		for (let i = 0; i < metadata!.width * metadata!.height; i++) {
			ormBuffer[i * 3 + 0] = channels[0]?.[i] ?? 255;
			ormBuffer[i * 3 + 1] = channels[1]?.[i] ?? 255;
			ormBuffer[i * 3 + 2] = channels[2]?.[i] ?? 255;
		}

		const instance = sharp(ormBuffer, {
			raw: {
				width: metadata!.width,
				height: metadata!.height,
				channels: 3,
			},
		}).jpeg();

		await downscaleTexture(instance);
		await instance.toFile(ormPath);

		const texture = new Texture(ormPath, editor.layout.preview.scene);
		material.metallicTexture = texture;

		configureImportedTexture(texture, false);
	} else if (occlusion) {
		await downscaleTexture(occlusion);
		await occlusion.toFile(occlusionPath);

		const texture = new Texture(occlusionPath, editor.layout.preview.scene);
		material.ambientTexture = texture;

		configureImportedTexture(texture, false);
	}

	await writeJSON(materialFilePath, material.serialize(), {
		spaces: "\t",
		encoding: "utf-8",
	});

	if (!parameters.importMeshes) {
		material.dispose(true, true);
	}

	return material;
}

export async function downscaleTexture(instance: Sharp) {
	const metadata = await instance.metadata();
	if (!metadata) {
		return;
	}

	const isPOT = metadata.width === metadata.height;
	if (isPOT && metadata.width > 1024) {
		const size = metadata.width / 4;
		if (size >= 256) {
			instance.resize(size, size);
		}
	}
}
