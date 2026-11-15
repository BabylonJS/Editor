import { SceneContext } from "@babylonjs/lite";

import { SceneLoaderQualitySelector } from "../loading/loader";
import { _reloadSceneTextures } from "../loading/texture";

import { getPowerOfTwoUntil } from "./scalar";

let useKtx2CompressedTextures = false;

/**
 * Sets wether or not to use KTX2 compressed textures in the application (disabled by default).
 * When enabled, the application will try to load KTX2 textures instead of the original textures when possible, and will ignore any KTX2 texture when disabled.
 * Only the KTX2 format is supported by the tools for compressed textures (the KTX1 "-astc.ktx", "-dxt.ktx", etc. formats are not).
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
 * Updates the textures of the given scene to match the given quality. Babylon Lite textures are immutable: the textures
 * of the editor scenes are loaded again using the new quality and assigned to the materials (and scripts) using them.
 * @param quality defines the quality to apply to the textures.
 * @param scene defines the scene to update the textures in.
 * @param rootUrl kept for compatibility with the Babylon.js version of the tools: the textures are loaded again using the root url of the scene they come from.
 * @see `SceneLoaderQualitySelector` for more information on the available quality levels.
 */
export async function applyTexturesQuality(quality: SceneLoaderQualitySelector, scene: SceneContext, rootUrl?: string): Promise<void> {
	if (scene.loadingTexturesQuality === quality) {
		return;
	}

	void rootUrl;

	scene.loadingTexturesQuality = quality;
	await _reloadSceneTextures(scene, quality);
}

/**
 * Gets the URL suffix to use for a texture based on the scene's loading texture quality and the texture's metadata.
 * @param sourceProperty defines the texture serialization object to get the suffix for.
 * @param scene defines the scene to get the loading texture quality from.
 * @returns the URL to use for the texture, or the original texture name if no suffix should be applied.
 */
export function getTextureUrl(sourceProperty: any, scene: SceneContext) {
	return getTextureUrlForQuality(sourceProperty, scene.loadingTexturesQuality ?? "high");
}

/**
 * Gets the URL to use for a texture based on the given quality and the texture's metadata.
 * @param sourceProperty defines the texture serialization object to get the URL for.
 * @param quality defines the quality of the texture to load.
 * @returns the URL to use for the texture, or the original texture name if no suffix should be applied.
 */
export function getTextureUrlForQuality(sourceProperty: any, quality: SceneLoaderQualitySelector) {
	if (quality === "high" || !sourceProperty.metadata?.baseSize) {
		return sourceProperty.name;
	}

	const width = sourceProperty.metadata.baseSize.width;
	const height = sourceProperty.metadata.baseSize.height;

	const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

	let suffix = "";

	switch (quality) {
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
