import {
	createPbrMaterial,
	createTexture2DFromPixels,
	enableMaterialUvTransform,
	enablePbrLightmap,
	Material,
	PbrMaterialProps,
	rebuildMaterial,
	SceneContext,
	setPbrAlphaCutoff,
	setPbrAnisotropy,
	setPbrClearCoat,
	setPbrEmissive,
	setPbrGammaAlbedo,
	setPbrIridescence,
	setPbrLightmap,
	setPbrMetallicReflectance,
	setPbrSheen,
	setPbrSkybox,
	setPbrSubsurface,
	setPbrUnlit,
	srgbByteToLinear,
	Texture2D,
} from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";

import { hasSerializedTextureTransform, isSerializedTextureInGammaSpace, isSerializedTextureInSrgbBuffer, ISerializedTextureLoadOptions, loadSerializedTexture } from "../texture";

import {
	colorTextureRepackReason,
	getColorTextureRepack,
	getNormalMapChannels,
	loadRepackedSerializedTexture,
	loadSerializedTexturePixels,
	RepackChannels,
	RepackPixelsFunction,
} from "./repack";
import { _createMaterialImageProcessingPlugin } from "./image-processing";

/**
 * Defines the context of a material being parsed: the textures to load before the material is ready.
 */
interface _IPbrParseContext {
	scene: SceneContext;
	rootUrl: string;
	material: PbrMaterialProps;
	promises: Promise<unknown>[];
	hasTransform: boolean;
}

function loadSlot(context: _IPbrParseContext, data: any, options: ISerializedTextureLoadOptions, assign: (texture: Texture2D) => void): void {
	if (!data || data.isCube) {
		return;
	}

	if (hasSerializedTextureTransform(data)) {
		context.hasTransform = true;
	}

	let built = false;

	context.promises.push(
		loadSerializedTexture(context.scene, context.rootUrl, data, options, (texture) => {
			assign(texture);

			if (built) {
				rebuildMaterial(context.scene, context.material);
			}
			built = true;
		})
	);
}

/**
 * Loads the metallic texture of the material. Babylon Lite reads the metallic, roughness and ambient occlusion
 * values from the blue, green and red channels (as glTF does) while Babylon.js can be configured to read them from
 * other channels: in this case the texture is repacked.
 */
function loadMetallicTexture(context: _IPbrParseContext, data: any): void {
	const textureData = data.metallicTexture;

	const aoFromRed = !!data.useAmbientOcclusionFromMetallicTextureRed;
	const roughnessFromAlpha = !!data.useRoughnessFromMetallicTextureAlpha;
	const roughnessFromGreen = !roughnessFromAlpha && !!data.useRoughnessFromMetallicTextureGreen;
	const metallicFromBlue = !!data.useMetallnessFromMetallicTextureBlue;

	// Babylon Lite always reads the ambient occlusion from the red channel.
	if (!aoFromRed) {
		context.material.occlusionStrength = 0;
	}

	if (metallicFromBlue && roughnessFromGreen) {
		return loadSlot(context, textureData, { srgb: false }, (texture) => (context.material.ormTexture = texture));
	}

	const channels: RepackChannels = [
		aoFromRed ? { channel: 0 } : { value: 1 },
		roughnessFromAlpha ? { channel: 3 } : roughnessFromGreen ? { channel: 1 } : { value: 1 },
		metallicFromBlue ? { channel: 2 } : { channel: 0 },
		{ value: 1 },
	];

	loadRepackedSlot(
		context,
		textureData,
		channels,
		"Babylon Lite reads the metallic, roughness and ambient occlusion values from the blue, green and red channels",
		(texture) => (context.material.ormTexture = texture)
	);
}

/**
 * Loads the given texture repacked as given (see `loadRepackedTexture`). The texture is used as it is when it can't be
 * repacked.
 */
function loadRepackedSlot(
	context: _IPbrParseContext,
	textureData: any,
	repack: RepackChannels | RepackPixelsFunction,
	reason: string,
	assign: (texture: Texture2D) => void,
	srgb: boolean = false
): void {
	if (hasSerializedTextureTransform(textureData)) {
		context.hasTransform = true;
	}

	let built = false;

	context.promises.push(
		loadRepackedSerializedTexture(context.scene, context.rootUrl, textureData, {
			repack,
			reason,
			srgb,
			assign: (texture) => {
				assign(texture);

				if (built) {
					rebuildMaterial(context.scene, context.material);
				}
				built = true;
			},
		})
	);
}

/**
 * Converts the given linear value to the sRGB color space.
 */
function linearToSrgb(value: number): number {
	return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

/**
 * Loads the given color texture (ie. emissive) so Babylon Lite decodes its colors as Babylon.js does: the texture is
 * repacked when needed (see `getColorTextureRepack`).
 */
function loadColorSlot(context: _IPbrParseContext, textureData: any, assign: (texture: Texture2D) => void): void {
	const { repack, srgb } = getColorTextureRepack(textureData, false);
	if (repack) {
		return loadRepackedSlot(context, textureData, repack, colorTextureRepackReason, assign, srgb);
	}

	loadSlot(context, textureData, { srgb }, assign);
}

/**
 * Configures the specular-glossiness workflow of the material (Babylon.js PBR materials without metallic or roughness
 * value): the reflectivity color is the specular color (F0) of the material and the micro surface its glossiness.
 * Babylon Lite reads them from its reflectance value when the reflectivity is gray and comes from no texture, or from
 * a specular-glossiness texture (RGB = specular color, A = glossiness) otherwise: the reflectivity texture is repacked
 * to contain the values computed by Babylon.js (texture color multiplied by the reflectivity color and the level of the
 * texture, micro surface read from the alpha channel or computed from the specular color).
 */
function loadSpecularGlossiness(context: _IPbrParseContext, data: any): void {
	const material = context.material;

	const reflectivity: number[] = data.reflectivity ?? data.reflectivityColor ?? [1, 1, 1];
	const microSurface = Math.max(0, Math.min(1, data.microSurface ?? 1));

	material.metallicFactor = 0;
	material.roughnessFactor = 1 - microSurface;

	const textureData = data.reflectivityTexture;

	if (!textureData || textureData.isCube) {
		if (reflectivity[0] === reflectivity[1] && reflectivity[1] === reflectivity[2]) {
			material.reflectance = reflectivity[0];
		} else {
			const pixels = new Uint8Array([
				Math.round(linearToSrgb(Math.max(0, Math.min(1, reflectivity[0]))) * 255),
				Math.round(linearToSrgb(Math.max(0, Math.min(1, reflectivity[1]))) * 255),
				Math.round(linearToSrgb(Math.max(0, Math.min(1, reflectivity[2]))) * 255),
				Math.round(microSurface * 255),
			]);

			material.specGlossTexture = createTexture2DFromPixels(context.scene.surface.engine, pixels, 1, 1, { srgb: true });
		}

		return;
	}

	const level = textureData.level ?? 1;
	const srgbBuffer = isSerializedTextureInSrgbBuffer(textureData);
	const gammaSpace = isSerializedTextureInGammaSpace(textureData);
	const microSurfaceFromAlpha = !!data.useMicroSurfaceFromReflectivityMapAlpha;
	const automaticMicroSurface = !microSurfaceFromAlpha && !!data.useAutoMicroSurfaceFromReflectivityMap;

	const factors = [reflectivity[0] * level, reflectivity[1] * level, reflectivity[2] * level];

	// Same as the "reflectivity" block of the PBR shaders of Babylon.js (approximated sRGB decoding included), the
	// textures loaded in a sRGB buffer being decoded by the GPU.
	const repack: RepackPixelsFunction = (pixels) => {
		for (let i = 0, len = pixels.length; i < len; i += 4) {
			let r = pixels[i] / 255;
			let g = pixels[i + 1] / 255;
			let b = pixels[i + 2] / 255;

			if (srgbBuffer) {
				r = srgbByteToLinear(pixels[i]);
				g = srgbByteToLinear(pixels[i + 1]);
				b = srgbByteToLinear(pixels[i + 2]);
			} else if (gammaSpace) {
				r = Math.pow(r, 2.2);
				g = Math.pow(g, 2.2);
				b = Math.pow(b, 2.2);
			}

			r *= factors[0];
			g *= factors[1];
			b *= factors[2];

			let glossiness = microSurface;
			if (microSurfaceFromAlpha) {
				glossiness *= pixels[i + 3] / 255;
			} else if (automaticMicroSurface) {
				const luminance = Math.max(0, Math.min(1, 0.2126 * r + 0.7152 * g + 0.0722 * b));
				glossiness *= Math.sqrt(luminance) * 0.95;
			}

			pixels[i] = Math.round(linearToSrgb(Math.max(0, Math.min(1, r))) * 255);
			pixels[i + 1] = Math.round(linearToSrgb(Math.max(0, Math.min(1, g))) * 255);
			pixels[i + 2] = Math.round(linearToSrgb(Math.max(0, Math.min(1, b))) * 255);
			pixels[i + 3] = Math.round(Math.max(0, Math.min(1, glossiness)) * 255);
		}
	};

	loadRepackedSlot(
		context,
		textureData,
		repack,
		"Babylon Lite reads the specular color and the glossiness from the RGB and alpha channels of the specular-glossiness textures",
		(texture) => (material.specGlossTexture = texture),
		true
	);
}

/**
 * Loads the normal map of the material. Babylon Lite reads the normal maps as Babylon.js does with
 * `invertNormalMapX = true` and `invertNormalMapY = false` (the convention of glTF in a left-handed scene): the
 * red and green channels of the other normal maps are inverted.
 */
function loadNormalSlot(context: _IPbrParseContext, textureData: any, invertX: boolean, invertY: boolean, assign: (texture: Texture2D) => void): void {
	const channels = getNormalMapChannels(!invertX, invertY);
	if (!channels) {
		return loadSlot(context, textureData, { srgb: false }, assign);
	}

	loadRepackedSlot(context, textureData, channels, "Babylon Lite reads the normal maps with the X axis inverted and the Y axis not inverted", assign);
}

/**
 * Returns the transparency mode of the given serialized material: 0 = opaque, 1 = alpha test, 2 = alpha blend and
 * 3 = alpha test and blend. When no transparency mode is set, the mode is computed as Babylon.js does
 * (`needAlphaBlendingForMesh` and `needAlphaTestingForMesh` of PBR materials: no alpha test when the material is blended).
 * @internal
 */
export function _getPbrTransparencyMode(data: any): number {
	if (data.transparencyMode !== undefined && data.transparencyMode !== null) {
		return data.transparencyMode;
	}

	const albedoHasAlpha = !!(data.albedoTexture ?? data.baseTexture)?.hasAlpha;

	if ((data.alpha ?? 1) < 1 || !!data.opacityTexture || (albedoHasAlpha && !!data.useAlphaFromAlbedoTexture)) {
		return 2;
	}

	return albedoHasAlpha ? 1 : 0;
}

/**
 * Returns the luminance of the given color, as Babylon.js computes it.
 */
function getLuminance(r: number, g: number, b: number): number {
	return Math.max(0, Math.min(1, 0.2126 * r + 0.7152 * g + 0.0722 * b));
}

/**
 * Loads the base color texture of the material. Babylon Lite reads the alpha of the material from the alpha channel
 * of the base color texture while Babylon.js reads it from the albedo texture only when asked (`useAlphaFromAlbedoTexture`
 * or alpha test) and from the opacity texture (alpha channel or luminance of its color): when the alpha of the material
 * is used (alpha blend or alpha test), the alpha channel of the base color texture is computed as Babylon.js computes
 * the alpha. Without albedo texture, the opacity texture is used to create a white base color texture with that alpha.
 */
function loadBaseColor(context: _IPbrParseContext, data: any, transparencyMode: number): void {
	const material = context.material;

	const albedoData = data.albedoTexture ?? data.baseTexture;
	const opacityData = data.opacityTexture && !data.opacityTexture.isCube ? data.opacityTexture : null;

	// Babylon.js decodes the albedo textures loaded in a sRGB buffer with the GPU, and the ones in gamma space in its
	// shaders (approximated sRGB curve), as Babylon Lite does with the gamma albedo.
	const srgb = isSerializedTextureInSrgbBuffer(albedoData);
	if (albedoData && isSerializedTextureInGammaSpace(albedoData)) {
		setPbrGammaAlbedo(material);
	}

	const assign = (texture: Texture2D) => (material.baseColorTexture = texture);

	const blend = transparencyMode === 2 || transparencyMode === 3;
	const alphaTest = transparencyMode === 1 || transparencyMode === 3 || !!data.forceAlphaTest;

	// The alpha of opaque materials is not used.
	if (!blend && !alphaTest) {
		return loadSlot(context, albedoData, { srgb }, assign);
	}

	const useAlbedoAlpha = !!albedoData && (alphaTest || (!!albedoData.hasAlpha && !!data.useAlphaFromAlbedoTexture && transparencyMode !== 0));

	if (!opacityData) {
		// JPEG images have no alpha channel.
		if (!albedoData || useAlbedoAlpha || /\.jpe?g$/i.test(albedoData.name ?? "")) {
			return loadSlot(context, albedoData, { srgb }, assign);
		}

		return loadRepackedSlot(
			context,
			albedoData,
			[{ channel: 0 }, { channel: 1 }, { channel: 2 }, { value: 1 }],
			"Babylon Lite reads the alpha of the material from the base color texture",
			assign,
			srgb
		);
	}

	// The alpha computed from the luminance of the opacity texture replaces the alpha of the material in Babylon.js.
	const opacityFromRgb = !!opacityData.getAlphaFromRGB;
	const opacityLevel = opacityData.level ?? 1;

	if (opacityFromRgb) {
		material.alpha = 1;
	}

	const getOpacity = (opacity: Uint8ClampedArray, i: number) =>
		opacityFromRgb ? getLuminance(opacity[i] / 255, opacity[i + 1] / 255, opacity[i + 2] / 255) : opacity[i + 3] / 255;

	const reason = "Babylon Lite reads the alpha of the material from the base color texture";

	if (!albedoData) {
		return loadRepackedSlot(
			context,
			opacityData,
			(pixels) => {
				for (let i = 0, len = pixels.length; i < len; i += 4) {
					const alpha = getOpacity(pixels, i) * opacityLevel;

					pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
					pixels[i + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
				}
			},
			reason,
			assign
		);
	}

	const transformKeys = ["uScale", "vScale", "uOffset", "vOffset", "wAng", "coordinatesIndex"];
	if (transformKeys.some((key) => (albedoData[key] ?? 0) !== (opacityData[key] ?? 0))) {
		warnOnce(
			`pbr-opacity-transform-${data.name}`,
			`the opacity texture of the material "${data.name}" doesn't use the same UV transform as its albedo texture: it is read with the UV transform of the albedo texture.`
		);
	}

	const sameImage = opacityData.name === albedoData.name;

	loadRepackedSlot(
		context,
		albedoData,
		async (pixels, repackContext) => {
			const opacity = sameImage ? pixels.slice() : await loadSerializedTexturePixels(repackContext, opacityData, repackContext.width, repackContext.height);
			if (!opacity) {
				return;
			}

			for (let i = 0, len = pixels.length; i < len; i += 4) {
				const opacityValue = getOpacity(opacity, i);
				const alpha = (opacityFromRgb ? opacityValue : (useAlbedoAlpha ? pixels[i + 3] / 255 : 1) * opacityValue) * opacityLevel;

				pixels[i + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
			}
		},
		reason,
		assign,
		srgb
	);
}

/**
 * Loads the given optional serialized texture and resolves with the loaded texture (undefined when not set or when
 * the texture can't be loaded).
 */
function loadOptionalTexture(context: _IPbrParseContext, data: any): Promise<Texture2D | undefined> {
	if (!data || data.isCube) {
		return Promise.resolve(undefined);
	}

	if (hasSerializedTextureTransform(data)) {
		context.hasTransform = true;
	}

	return loadSerializedTexture(context.scene, context.rootUrl, data, { srgb: false }).then((texture) => texture ?? undefined);
}

/**
 * Loads the given optional serialized color texture so Babylon Lite decodes its colors as Babylon.js does (see
 * `getColorTextureRepack`) and resolves with the loaded texture (undefined when not set or when the texture can't be
 * loaded).
 * @param shaderDecodesGamma defines wether or not the shaders of Babylon Lite decode the colors of the texture with the
 * approximated sRGB curve.
 */
function loadOptionalColorTexture(context: _IPbrParseContext, data: any, shaderDecodesGamma: boolean): Promise<Texture2D | undefined> {
	if (!data || data.isCube) {
		return Promise.resolve(undefined);
	}

	if (hasSerializedTextureTransform(data)) {
		context.hasTransform = true;
	}

	const { repack, srgb } = getColorTextureRepack(data, shaderDecodesGamma);
	const promise = repack
		? loadRepackedSerializedTexture(context.scene, context.rootUrl, data, { repack, reason: colorTextureRepackReason, srgb })
		: loadSerializedTexture(context.scene, context.rootUrl, data, { srgb });

	return promise.then((texture) => texture ?? undefined);
}

/**
 * Parses the sub-configurations of the PBR material (Babylon.js material plugins): clear coat, sheen, anisotropy,
 * iridescence and sub-surface translucency. Their textures are loaded before the features are set on the material.
 */
function parsePlugins(context: _IPbrParseContext, data: any): void {
	const material = context.material;
	const plugins = data.plugins ?? {};

	const clearCoat = plugins.PBRClearCoatConfiguration ?? data.clearCoat;
	if (clearCoat?.isEnabled) {
		context.promises.push(
			Promise.all([
				loadOptionalTexture(context, clearCoat.texture),
				loadOptionalTexture(context, clearCoat.textureRoughness),
				loadOptionalTexture(context, clearCoat.bumpTexture),
			]).then(([texture, roughnessTexture, bumpTexture]) => {
				setPbrClearCoat(material, {
					isEnabled: true,
					intensity: clearCoat.intensity ?? 1,
					roughness: clearCoat.roughness ?? 0,
					indexOfRefraction: clearCoat.indexOfRefraction ?? 1.5,
					useF0Remap: clearCoat.remapF0OnInterfaceChange ?? true,
					texture,
					roughnessTexture,
					bumpTexture,
					bumpTextureScale: clearCoat.bumpTexture?.level ?? 1,
				});
			})
		);
	}

	const sheen = plugins.PBRSheenConfiguration ?? data.sheen;
	if (sheen?.isEnabled) {
		context.promises.push(
			// The shaders of Babylon Lite decode the colors of the sheen textures, except with the albedo scaling.
			Promise.all([loadOptionalColorTexture(context, sheen.texture, !(sheen.albedoScaling ?? false)), loadOptionalTexture(context, sheen.textureRoughness)]).then(
				([texture, roughnessTexture]) => {
					setPbrSheen(material, {
						isEnabled: true,
						color: sheen.color ?? [1, 1, 1],
						roughness: sheen.roughness ?? 0,
						intensity: sheen.intensity ?? 1,
						albedoScaling: sheen.albedoScaling ?? false,
						texture,
						roughnessTexture,
					});
				}
			)
		);
	}

	const anisotropy = plugins.PBRAnisotropicConfiguration ?? data.anisotropy;
	if (anisotropy?.isEnabled) {
		context.promises.push(
			loadOptionalTexture(context, anisotropy.texture).then((texture) => {
				setPbrAnisotropy(material, {
					isEnabled: true,
					intensity: anisotropy.intensity ?? 1,
					direction: anisotropy.direction ?? [1, 0],
					texture,
				});
			})
		);
	}

	const iridescence = plugins.PBRIridescenceConfiguration ?? data.iridescence;
	if (iridescence?.isEnabled) {
		context.promises.push(
			Promise.all([loadOptionalTexture(context, iridescence.texture), loadOptionalTexture(context, iridescence.thicknessTexture)]).then(([texture, thicknessTexture]) => {
				setPbrIridescence(material, {
					isEnabled: true,
					intensity: iridescence.intensity ?? 1,
					indexOfRefraction: iridescence.indexOfRefraction ?? 1.3,
					minimumThickness: iridescence.minimumThickness ?? 100,
					maximumThickness: iridescence.maximumThickness ?? 400,
					texture,
					thicknessTexture,
				});
			})
		);
	}

	const subSurface = plugins.PBRSubSurfaceConfiguration ?? data.subSurface;
	if (subSurface?.isTranslucencyEnabled) {
		context.promises.push(
			loadOptionalTexture(context, subSurface.thicknessTexture).then((thicknessTexture) => {
				setPbrSubsurface(material, {
					translucency: {
						intensity: subSurface.translucencyIntensity ?? 1,
						color: subSurface.translucencyColor ?? undefined,
						diffusionDistance: subSurface.diffusionDistance ?? undefined,
					},
					tint: {
						color: subSurface.tintColor ?? [1, 1, 1],
						atDistance: subSurface.tintColorAtDistance ?? 1,
					},
					thickness: {
						texture: thicknessTexture,
						min: subSurface.minimumThickness ?? 0,
						max: subSurface.maximumThickness ?? 1,
					},
				});
			})
		);
	}
}

/**
 * Returns wether or not the given serialized PBR material is a skybox material: its reflection texture is a cube
 * texture sampled along the view direction (skybox mode), as created by `scene.createDefaultSkybox`. Babylon Lite PBR
 * skyboxes sample the environment of the scene: the reflection texture is expected to be the environment texture.
 * @param data defines the serialized PBR material.
 */
export function isPbrSkyboxData(data: any): boolean {
	return !!data.reflectionTexture?.isCube && data.reflectionTexture.coordinatesMode === 5;
}

const pbrSkyboxMaterials = new WeakSet<Material>();

/**
 * Returns wether or not the given material is a PBR material created as a skybox material (see `isPbrSkyboxData`).
 * @param material defines the reference to the material.
 */
export function isPbrSkyboxMaterial(material: Material | null | undefined): boolean {
	return !!material && pbrSkyboxMaterials.has(material);
}

/**
 * Parses the given serialized Babylon.js PBR material (`BABYLON.PBRMaterial`) and creates the equivalent Babylon Lite
 * PBR material. Babylon Lite implements the glTF metallic-roughness model: the features of Babylon.js PBR materials
 * that have no equivalent are listed in MISSING_FEATURES.md.
 * @param scene defines the reference to the scene being loaded.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized material.
 * @returns the created material and a promise resolved once all its textures are loaded.
 */
export function parsePbrMaterial(scene: SceneContext, rootUrl: string, data: any): { material: PbrMaterialProps; promise: Promise<void> } {
	const albedo = data.albedo ?? data.albedoColor ?? data.baseColor ?? [1, 1, 1];

	const material = createPbrMaterial({
		name: data.name,
		baseColorFactor: [albedo[0], albedo[1], albedo[2], 1],
		alpha: data.alpha ?? 1,
		doubleSided: data.backFaceCulling === false,
		environmentIntensity: data.environmentIntensity ?? 1,
		directIntensity: data.directIntensity ?? 1,
		usePhysicalLightFalloff: data.usePhysicalLightFalloff ?? true,
		enableSpecularAA: data.enableSpecularAntiAliasing ?? false,
	});

	material.metadata = data.metadata;

	// Image processing: the material outputs its linear color when the image processing is applied by a post-process,
	// or applies the image processing itself, using the configuration of the scene or the configuration saved with the
	// material by some versions of the editor.
	material.plugins = [...(material.plugins ?? []), _createMaterialImageProcessingPlugin(scene, material, data._imageProcessingConfiguration, "pbr")];

	const context: _IPbrParseContext = {
		scene,
		rootUrl,
		material,
		promises: [],
		hasTransform: false,
	};

	// Base color and transparency
	const transparencyMode = _getPbrTransparencyMode(data);

	loadBaseColor(context, data, transparencyMode);

	switch (transparencyMode) {
		case 1:
			setPbrAlphaCutoff(material, data.alphaCutOff ?? 0.4);
			break;
		case 2:
			material.alphaBlend = true;
			break;
		case 3:
			material.alphaBlend = true;
			setPbrAlphaCutoff(material, data.alphaCutOff ?? 0.4);
			break;
	}

	if (data.forceAlphaTest) {
		setPbrAlphaCutoff(material, data.alphaCutOff ?? 0.4);
	}

	// Metallic / roughness
	const isMetallicWorkflow = !!data.metallicTexture || (data.metallic !== undefined && data.metallic !== null) || (data.roughness !== undefined && data.roughness !== null);

	if (isMetallicWorkflow) {
		material.metallicFactor = data.metallic ?? 1;
		material.roughnessFactor = data.roughness ?? 1;

		if (data.metallicTexture) {
			loadMetallicTexture(context, data);
		}
	} else {
		loadSpecularGlossiness(context, data);
	}

	if (data.metallicReflectanceColor || data.metallicF0Factor !== undefined || data.metallicReflectanceTexture || data.reflectanceTexture) {
		context.promises.push(
			// The shaders of Babylon Lite decode the colors of the reflectance textures.
			Promise.all([loadOptionalColorTexture(context, data.metallicReflectanceTexture, true), loadOptionalColorTexture(context, data.reflectanceTexture, true)]).then(
				([texture, reflectanceTexture]) => {
					setPbrMetallicReflectance(material, {
						color: data.metallicReflectanceColor ?? [1, 1, 1],
						f0Factor: data.metallicF0Factor ?? 1,
						useOnlyMetallicFromTexture: data.useOnlyMetallicFromMetallicReflectanceTexture ?? false,
						texture,
						reflectanceTexture,
					});
				}
			)
		);
	}

	// Normal map
	if (data.bumpTexture && !data.disableBumpMap) {
		material.normalTextureScale = data.bumpTexture.level ?? 1;
		loadNormalSlot(context, data.bumpTexture, !!data.invertNormalMapX, !!data.invertNormalMapY, (texture) => (material.normalTexture = texture));
	}

	// Ambient occlusion
	if (data.ambientTexture) {
		material.occlusionStrength = data.ambientTextureStrength ?? 1;
		material.occlusionTexCoord = data.ambientTexture.coordinatesIndex === 1 ? 1 : 0;
		loadSlot(context, data.ambientTexture, { srgb: false }, (texture) => (material.occlusionTexture = texture));
	}

	// Emissive
	const emissive = data.emissive ?? data.emissiveColor ?? [0, 0, 0];
	const emissiveIntensity = data.emissiveIntensity ?? 1;

	if (data.emissiveTexture || emissive[0] || emissive[1] || emissive[2]) {
		setPbrEmissive(material, [emissive[0] * emissiveIntensity, emissive[1] * emissiveIntensity, emissive[2] * emissiveIntensity]);

		if (data.emissiveTexture) {
			// Babylon.js multiplies the emissive texture by the emissive color: a black emissive color with a texture is white.
			if (!emissive[0] && !emissive[1] && !emissive[2]) {
				setPbrEmissive(material, [emissiveIntensity, emissiveIntensity, emissiveIntensity]);
			}

			loadColorSlot(context, data.emissiveTexture, (texture) => (material.emissiveTexture = texture));
		}
	}

	// Lightmap
	if (data.lightmapTexture) {
		const lightmapData = data.lightmapTexture;
		context.promises.push(
			enablePbrLightmap().then(() =>
				loadSerializedTexture(scene, rootUrl, lightmapData, { srgb: false }, (texture) => {
					setPbrLightmap(material, texture, {
						level: lightmapData.level ?? 1,
						coordIndex: lightmapData.coordinatesIndex === 0 ? 0 : 1,
						useAsShadowmap: data.useLightmapAsShadowmap ?? false,
						gamma: isSerializedTextureInGammaSpace(lightmapData),
					});
				})
			)
		);
	}

	if (data.unlit) {
		setPbrUnlit(material);
	} else {
		if (isPbrSkyboxData(data)) {
			setPbrSkybox(material);
			pbrSkyboxMaterials.add(material);
		}

		// Babylon.js only disables the lights (not the image based lighting) of the materials with "disableLighting".
		if (data.disableLighting) {
			material.directIntensity = 0;
		}
	}

	parsePlugins(context, data);

	const promise = Promise.all(context.promises).then(() => {
		if (context.hasTransform) {
			enableMaterialUvTransform(material);
		}
	});

	return { material, promise };
}
