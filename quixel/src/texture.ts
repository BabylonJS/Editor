import { join, dirname } from "path/posix";
import { copyFile, writeFile } from "fs-extra";

import sharp from "sharp";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { QuixelJsonType } from "./typings";

import { MaskPacker } from "./packers/mask";
import { AlbedoOpacityPacker } from "./packers/albedo-opacity";
import { MetallicAmbientPacker } from "./packers/metallic-ambient";
import { MetallicRoughnessPacker } from "./packers/metallic-roughness";
import { NormalDisplacementPacker } from "./packers/normal-displacement";
import { ReflectivityGlossinessPacker } from "./packers/reflectivity-glossiness";

const supportedTexturesTypes: string[] = [
	"albedo", "normal", "specular", "ao", "metalness", "opacity", "roughness", "specular",
	"gloss", "translucency", "mask", "displacement",
];

export async function setupTextures(editor: Editor, json: QuixelJsonType, material: PBRMaterial, assetsFolder: string) {
	if (!editor.state.projectPath) {
		return [];
	}

	const projectFolder = join(dirname(editor.state.projectPath), "/");

	let albedoTexture: Texture | null = null;
	let opacityTexture: Texture | null = null;

	let reflectivityTexture: Texture | null = null;
	let microSurfaceTexture: Texture | null = null;

	let metallicTexture: Texture | null = null;
	let roughnessTexture: Texture | null = null;

	let bumpTexture: Texture | null = null;
	let displacementTexture: Texture | null = null;

	let aoTexture: Texture | null = null;

	let maskTexture: Texture | null = null;

	const components = json.components
		.concat(json.packedTextures ?? [])
		.filter((c) => supportedTexturesTypes.indexOf(c.type) !== -1);

	const metallicRoughnessComponent = components.find((c) => c.type === "metalness" || c.type === "roughness");

	const promises = components.map(async (c) => {
		if ((c.type === "specular" || c.type === "gloss") && metallicRoughnessComponent) {
			return;
		}

		const path = join(assetsFolder, c.name);
		let texture: Texture;

		try {
			texture = await new Promise<Texture>((resolve, reject) => {
				const texture = new Texture(path, editor.layout.preview.scene, false, true, undefined, () => {
					texture.uniqueId = UniqueNumber.Get();
					texture.name = path.replace(projectFolder, "");
					texture.url = texture.name;
					resolve(texture);
				}, (_, e) => {
					texture.dispose();
					reject(e);
				});
			});
		} catch (e) {
			return;
		}

		switch (c.type) {
		case "albedo": albedoTexture = texture; break;
		case "opacity": opacityTexture = texture; break;
		case "mask": maskTexture = texture; break;

		case "normal": bumpTexture = texture; break;
		case "displacement": displacementTexture = texture; break;

		case "specular":
			if (!metallicRoughnessComponent) {
				reflectivityTexture = texture;
			}
			break;

		case "gloss":
			if (!metallicRoughnessComponent) {
				microSurfaceTexture = texture;
			}
			break;

		case "metalness": metallicTexture = texture; break;
		case "roughness": roughnessTexture = texture; break;
		case "ao": aoTexture = texture; break;

		case "translucency":
			material.subSurface.isTranslucencyEnabled = true;
			material.subSurface.thicknessTexture = texture;
			material.subSurface.useMaskFromThicknessTexture = true;
			break;
		}
	});

	await Promise.all(promises);

	// Pack textures
	await Promise.all([
		AlbedoOpacityPacker.Pack(editor, material, albedoTexture, opacityTexture, assetsFolder),
		ReflectivityGlossinessPacker.Pack(editor, material, reflectivityTexture, microSurfaceTexture, assetsFolder),
		MetallicRoughnessPacker.Pack(editor, material, metallicTexture, roughnessTexture, assetsFolder),
		NormalDisplacementPacker.Pack(editor, material, bumpTexture, displacementTexture, assetsFolder),
	]);

	// Pack ao with metal
	await MetallicAmbientPacker.Pack(editor, material, material.metallicTexture as Texture, aoTexture, assetsFolder);

	// Pack mask texture
	await MaskPacker.Pack(editor, material, maskTexture, assetsFolder);
}

export async function copyTextures(editor: Editor, json: QuixelJsonType, assetsFolder: string) {
	const components = json.components
		.concat(json.packedTextures ?? [])
		.filter((c) => supportedTexturesTypes.indexOf(c.type) !== -1);

	const promises = components.map(async (c) => {
		// Get mode
		let simpleCopy = false;

		if (c.type === "albedo") {
			simpleCopy = true;
		}

		if (c.type === "opacity") {
			simpleCopy = true;
		}

		// Simply copy?
		if (simpleCopy) {
			const path = join(assetsFolder, c.name);
			await copyFile(c.path, path);

			return editor.layout.console.log(`Copied texture "${c.name}" at ${path}`);
		}

		// Check texture
		if (c.type === "specular" && json.components.find((c) => c.type === "roughness")) {
			return;
		}

		// Resize to lower resolution
		try {
			const buffer = await sharp(c.path).resize(1024, 1024).toBuffer();
			const path = join(assetsFolder, c.name);

			await writeFile(path, buffer);

			editor.layout.console.log(`Copied resized texture "${c.name}" at ${path}`);
		} catch (e) {
			// Catch silently.
		}
	});

	await Promise.all(promises);
}
