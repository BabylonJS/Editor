import sharp from "sharp";
import { join } from "path/posix";
import { writeJSON } from "fs-extra";

import { PBRMaterial, Texture } from "babylonjs";
import { configureImportedMaterial, configureImportedTexture, Editor } from "babylonjs-editor";

import { IFabMaterialJson } from "./typings";

export async function parseMaterial(editor: Editor, json: IFabMaterialJson, finalAssetsFolder: string) {
	const log = await editor.layout.console.progress("Importing Fab material...");

	const material = new PBRMaterial(json.name, editor.layout.preview.scene);
	material.useRoughnessFromMetallicTextureAlpha = false;

	configureImportedMaterial(material);

	const albedo = json.textures.albedo ? sharp(json.textures.albedo) : null;
	const normal = json.textures.normal ? sharp(json.textures.normal) : null;

	const roughness = json.textures.roughness ? sharp(json.textures.roughness) : null;
	const metal = json.textures.metal ? sharp(json.textures.metal) : null;
	const occlusion = json.textures.occlusion ? sharp(json.textures.occlusion) : null;

	const orm = json.textures.orm ? sharp(json.textures.orm) : null;

	const albedoPath = join(finalAssetsFolder, `${json.name}_albedo.jpg`);
	const bumpPath = join(finalAssetsFolder, `${json.name}_bump.png`);

	const occlusionPath = join(finalAssetsFolder, `${json.name}_occlusion.jpg`);

	const ormPath = join(finalAssetsFolder, `${json.name}_orm.jpg`);

	if (albedo) {
		await albedo.toFile(albedoPath);

		const texture = new Texture(albedoPath, editor.layout.preview.scene);
		material.albedoTexture = texture;

		configureImportedTexture(texture, false);
	}

	if (normal) {
		await normal.toFile(bumpPath);

		const texture = new Texture(bumpPath, editor.layout.preview.scene);
		material.bumpTexture = texture;

		configureImportedTexture(texture, false);
	}

	if (orm) {
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

		await sharp(ormBuffer, {
			raw: {
				width: metadata!.width,
				height: metadata!.height,
				channels: 3,
			},
		})
			.jpeg()
			.toFile(ormPath);

		const texture = new Texture(ormPath, editor.layout.preview.scene);
		material.metallicTexture = texture;

		configureImportedTexture(texture, false);
	} else if (occlusion) {
		await occlusion.toFile(occlusionPath);

		const texture = new Texture(occlusionPath, editor.layout.preview.scene);
		material.ambientTexture = texture;

		configureImportedTexture(texture, false);
	}

	log.setState({
		message: `Processed Fab material: ${json.name}`,
	});

	await writeJSON(join(finalAssetsFolder, `${json.name}.material`), material.serialize(), {
		spaces: "\t",
		encoding: "utf-8",
	});

	log.setState({
		done: true,
		message: `Imported Fab material: ${json.name}`,
	});

	return material;
}
