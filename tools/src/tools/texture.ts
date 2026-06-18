import { Scene } from "@babylonjs/core/scene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

import { SceneLoaderQualitySelector } from "../loading/loader";

import { isTexture } from "./guards";
import { getPowerOfTwoUntil } from "./scalar";

let useKtx2CompressedTextures = false;

/**
 * Sets wether or not to use KTX2 compressed textures in the application (disabled by default).
 * When enabled, the application will try to load KTX2 textures instead of the original textures when possible, and will ignore any KTX2 texture when disabled.
 * @param enabled defines wether or not to use KTX2 compressed textures in the application.
 */
export function setUseKtx2CompressedTextures(enabled: boolean) {
	useKtx2CompressedTextures = enabled;
}

/**
 * Returns wether or not KTX2 compressed textures are enabled in the application.
 */
export function isUsingKtx2CompressedTextures() {
	return useKtx2CompressedTextures;
}

/**
 * @internal
 */
export function _getKtx2TextureName(name: string) {
	return `${name.substring(0, name.lastIndexOf("."))}.ktx2`;
}

/**
 * Set the compressed texture format to use, based on the formats you have, and the formats
 * supported by the hardware / browser.
 * @param engine defines the reference to the engine to configure the texture format to use.
 * @see `@babylonjs/core/Engines/Extensions/engine.textureSelector.d.ts` for more information.
 */
export function configureEngineToUseCompressedTextures(engine: AbstractEngine) {
	engine.setCompressedTextureExclusions([".env", ".hdr", ".dds"]);
	engine.setTextureFormatToUse(["-dxt.ktx", "-astc.ktx", "-pvrtc.ktx", "-etc1.ktx", "-etc2.ktx"]);
}

/**
 * Adds the texture located at the given URL to the list of excluded compressed textures.
 * Which means it will not be loaded as a compressed texture even if it has a supported format and the hardware supports it.
 * @param engine defines the reference to the engine to register the excluded texture.
 * @param textureUrl defines the URL of the texture to exclude
 */
export function addExcludedCompressedTexture(engine: AbstractEngine, textureUrl: string) {
	if (engine._excludedCompressedTextures && !engine._excludedCompressedTextures?.includes(textureUrl)) {
		engine._excludedCompressedTextures?.push(textureUrl);
	}
}

/**
 * Updates URL of all textures in the scene to match the given quality when possible.
 * @param quality defines the quality to apply to the textures.
 * @param scene defines the scene to update the textures in.
 * @param rootUrl defines the root URL to use when updating the texture URLs.
 * @see `SceneLoaderQualitySelector` for more information on the available quality levels.
 */
export function applyTexturesQuality(quality: SceneLoaderQualitySelector, scene: Scene, rootUrl: string) {
	if (scene.loadingTexturesQuality === quality) {
		return;
	}

	scene.loadingTexturesQuality = quality;

	scene.textures.forEach((texture) => {
		if (!isTexture(texture) || !texture.url) {
			return;
		}

		const suffix = getTextureUrl(texture, scene);
		if (!suffix || texture.url.includes(suffix)) {
			return;
		}

		texture.updateURL(rootUrl + suffix);
	});
}

/**
 * Gets the URL suffix to use for a texture based on the scene's loading texture quality and the texture's metadata.
 * @param sourceProperty defines the texture to get the suffix for. Can be a texture or a texture serialization object.
 * @param scene defines the scene to get the loading texture quality from.
 * @returns the URL to use for the texture, or the original texture name if no suffix should be applied.
 */
export function getTextureUrl(sourceProperty: any, scene: Scene) {
	if (scene.loadingTexturesQuality === "high" || !sourceProperty.metadata?.baseSize) {
		return sourceProperty.name;
	}

	const width = sourceProperty.metadata.baseSize.width;
	const height = sourceProperty.metadata.baseSize.height;

	const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

	let suffix = "";

	switch (scene.loadingTexturesQuality) {
		case "medium":
			let midWidth = (width * 0.66) >> 0;
			let midHeight = (height * 0.66) >> 0;

			if (isPowerOfTwo) {
				midWidth = getPowerOfTwoUntil(midWidth);
				midHeight = getPowerOfTwoUntil(midHeight);
			}

			suffix = `_${midWidth}_${midHeight}`;
			break;

		case "low":
		case "very-low":
			let lowWidth = (width * 0.33) >> 0;
			let lowHeight = (height * 0.33) >> 0;

			if (isPowerOfTwo) {
				lowWidth = getPowerOfTwoUntil(lowWidth);
				lowHeight = getPowerOfTwoUntil(lowHeight);
			}

			suffix = `_${lowWidth}_${lowHeight}`;
			break;
	}

	const name = sourceProperty.name as string;

	if (!name || !suffix) {
		return sourceProperty.name;
	}

	const finalUrl = name.split("/");

	const filename = finalUrl.pop();
	if (!filename) {
		return sourceProperty.name;
	}

	const extension = filename.split(".").pop();
	const baseFilename = filename.replace(`.${extension}`, "");

	const newFilename = `${baseFilename}${suffix}.${extension}`;

	finalUrl.push(newFilename);

	return finalUrl.join("/");
}
