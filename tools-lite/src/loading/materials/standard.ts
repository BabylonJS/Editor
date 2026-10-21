import {
	createStandardMaterial,
	enableMaterialUvTransform,
	rebuildMaterial,
	SceneContext,
	setStandardAmbientTexture,
	setStandardBumpTexture,
	setStandardEmissiveTexture,
	setStandardLightmapTexture,
	setStandardOpacityTexture,
	setStandardReflectionTexture,
	setStandardSpecularTexture,
	StandardMaterialProps,
	Texture2D,
} from "@babylonjs/lite";

import { hasSerializedTextureTransform, loadSerializedTexture } from "../texture";

import { getNormalMapChannels, loadRepackedSerializedTexture, loadSerializedTexturePixels } from "./repack";

/**
 * Returns the transparency mode of the given serialized standard material: 0 = opaque, 1 = alpha test, 2 = alpha
 * blend and 3 = alpha test and blend. When no transparency mode is set, the mode is computed as Babylon.js does
 * (`needAlphaBlendingForMesh` and `needAlphaTestingForMesh` of standard materials: no alpha test when the material is blended).
 * @internal
 */
export function _getStandardTransparencyMode(data: any): number {
	if (data.transparencyMode !== undefined && data.transparencyMode !== null) {
		return data.transparencyMode;
	}

	const diffuseHasAlpha = !!data.diffuseTexture?.hasAlpha;
	if ((data.alpha ?? 1) < 1 || !!data.opacityTexture || (diffuseHasAlpha && !!data.useAlphaFromDiffuseTexture)) {
		return 2;
	}

	return diffuseHasAlpha ? 1 : 0;
}

function saturate(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

/**
 * Parses the given serialized Babylon.js standard material (`BABYLON.StandardMaterial`) and creates the equivalent
 * Babylon Lite standard material.
 * @param scene defines the reference to the scene being loaded.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized material.
 * @param sceneAmbientColor defines the ambient color of the scene, multiplied by the ambient color of the material as Babylon.js does.
 * @returns the created material and a promise resolved once all its textures are loaded.
 */
export function parseStandardMaterial(scene: SceneContext, rootUrl: string, data: any, sceneAmbientColor: number[]): { material: StandardMaterialProps; promise: Promise<void> } {
	const material = createStandardMaterial();

	material.name = data.name;
	material.metadata = data.metadata;

	if (data.diffuse) {
		material.diffuseColor = [data.diffuse[0], data.diffuse[1], data.diffuse[2]];
	}

	if (data.specular) {
		material.specularColor = [data.specular[0], data.specular[1], data.specular[2]];
	}

	if (data.specularPower !== undefined) {
		material.specularPower = data.specularPower;
	}

	if (data.emissive) {
		material.emissiveColor = [data.emissive[0], data.emissive[1], data.emissive[2]];
	}

	if (data.ambient) {
		material.ambientColor = [data.ambient[0] * (sceneAmbientColor[0] ?? 0), data.ambient[1] * (sceneAmbientColor[1] ?? 0), data.ambient[2] * (sceneAmbientColor[2] ?? 0)];
	}

	material.backFaceCulling = data.backFaceCulling ?? true;
	material.disableLighting = data.disableLighting ?? false;
	material.useLightmapAsShadowmap = data.useLightmapAsShadowmap ?? false;

	// Babylon Lite outputs "emissive * diffuse" when the lighting is disabled while Babylon.js outputs
	// "diffuse + emissive + ambient": the colors are combined so Babylon Lite outputs the same color.
	if (material.disableLighting && !data.emissiveTexture) {
		const diffuse = material.diffuseColor;
		const emissive = material.emissiveColor;
		const ambient = material.ambientColor ?? [0, 0, 0];

		material.diffuseColor = [saturate(diffuse[0] + emissive[0] + ambient[0]), saturate(diffuse[1] + emissive[1] + ambient[1]), saturate(diffuse[2] + emissive[2] + ambient[2])];
		material.emissiveColor = [1, 1, 1];
	}

	// Transparency: Babylon Lite blends the materials which alpha is less than 1 or which have an opacity texture, and
	// discards the fragments which alpha in the diffuse texture is less than the alpha cutoff.
	const transparencyMode = _getStandardTransparencyMode(data);
	const blend = transparencyMode === 2 || transparencyMode === 3;
	const alphaTest = transparencyMode === 1 || transparencyMode === 3;

	const alpha = data.alpha ?? 1;
	const alphaFromDiffuse = !!data.diffuseTexture?.hasAlpha && !!data.useAlphaFromDiffuseTexture && transparencyMode !== 0;

	material.alpha = blend ? alpha : 1;

	if (alphaTest) {
		const alphaCutOff = data.alphaCutOff ?? 0.4;
		const hasTransparencyMode = data.transparencyMode !== undefined && data.transparencyMode !== null;

		// When a transparency mode is set, Babylon.js tests the alpha of the material multiplied by the alpha of the
		// diffuse texture instead of the alpha of the diffuse texture only.
		if (!hasTransparencyMode) {
			material.alphaCutOff = alphaCutOff;
		} else if (alphaFromDiffuse) {
			material.alphaCutOff = alpha > 0 ? alphaCutOff / alpha : 2;
		}
	}

	const promises: Promise<unknown>[] = [];
	let hasTransform = false;

	function loadSlot(textureData: any, assign: (texture: Texture2D) => void, configure?: (textureData: any) => void) {
		if (!textureData || textureData.isCube) {
			return;
		}

		if (hasSerializedTextureTransform(textureData)) {
			hasTransform = true;
		}

		configure?.(textureData);

		let built = false;

		promises.push(
			loadSerializedTexture(scene, rootUrl, textureData, { srgb: false }, (texture) => {
				assign(texture);

				if (built) {
					rebuildMaterial(scene, material);
				}
				built = true;
			})
		);
	}

	loadSlot(
		data.diffuseTexture,
		(texture) => (material.diffuseTexture = texture),
		(textureData) => (material.diffuseCoordIndex = textureData.coordinatesIndex === 1 ? 1 : 0)
	);

	// Babylon Lite reads the normal maps of the standard materials as Babylon.js does with "invertNormalMapX" and
	// "invertNormalMapY" set to false: the red and green channels of the other normal maps are inverted.
	const normalMapChannels = getNormalMapChannels(!!data.invertNormalMapX, !!data.invertNormalMapY);
	if (normalMapChannels && data.bumpTexture && !data.bumpTexture.isCube) {
		material.bumpLevel = data.bumpTexture.level ?? 1;

		if (hasSerializedTextureTransform(data.bumpTexture)) {
			hasTransform = true;
		}

		let built = false;

		promises.push(
			loadRepackedSerializedTexture(scene, rootUrl, data.bumpTexture, {
				repack: normalMapChannels,
				reason: "Babylon Lite reads the normal maps with the X and Y axes not inverted",
				assign: (texture) => {
					setStandardBumpTexture(material, texture);

					if (built) {
						rebuildMaterial(scene, material);
					}
					built = true;
				},
			})
		);
	} else {
		loadSlot(
			data.bumpTexture,
			(texture) => setStandardBumpTexture(material, texture),
			(textureData) => (material.bumpLevel = textureData.level ?? 1)
		);
	}

	loadSlot(
		data.specularTexture,
		(texture) => setStandardSpecularTexture(material, texture),
		(textureData) => (material.specularCoordIndex = textureData.coordinatesIndex === 1 ? 1 : 0)
	);

	loadSlot(data.emissiveTexture, (texture) => setStandardEmissiveTexture(material, texture));

	loadSlot(
		data.ambientTexture,
		(texture) => setStandardAmbientTexture(material, texture),
		(textureData) => {
			material.ambientTexLevel = textureData.level ?? 1;
			material.ambientCoordIndex = textureData.coordinatesIndex === 1 ? 1 : 0;
		}
	);

	loadSlot(
		data.lightmapTexture,
		(texture) => setStandardLightmapTexture(material, texture),
		(textureData) => {
			material.lightmapLevel = textureData.level ?? 1;
			material.lightmapCoordIndex = textureData.coordinatesIndex === 0 ? 0 : 1;
		}
	);

	// Babylon Lite reads the alpha of the diffuse texture for the alpha test only: when Babylon.js reads it for the
	// alpha blending, the diffuse texture is the opacity texture too (combined with the opacity texture, if any).
	const opacityData = blend && data.opacityTexture && !data.opacityTexture.isCube ? data.opacityTexture : null;

	if (blend && alphaFromDiffuse) {
		material.opacityLevel = 1;
		material.opacityFromRGB = false;

		if (!opacityData) {
			loadSlot(data.diffuseTexture, (texture) => setStandardOpacityTexture(material, texture));
		} else {
			const opacityFromRgb = !!opacityData.getAlphaFromRGB;
			const opacityLevel = opacityData.level ?? 1;
			const sameImage = opacityData.name === data.diffuseTexture.name;

			let built = false;

			promises.push(
				loadRepackedSerializedTexture(scene, rootUrl, data.diffuseTexture, {
					reason: "Babylon Lite reads the alpha of the diffuse texture for the alpha test only",
					repack: async (pixels, context) => {
						const opacity = sameImage ? pixels.slice() : await loadSerializedTexturePixels(context, opacityData, context.width, context.height);
						if (!opacity) {
							return;
						}

						for (let i = 0, len = pixels.length; i < len; i += 4) {
							const opacityValue = opacityFromRgb ? (0.3 * opacity[i] + 0.59 * opacity[i + 1] + 0.11 * opacity[i + 2]) / 255 : opacity[i + 3] / 255;
							pixels[i + 3] = Math.round(saturate((pixels[i + 3] / 255) * opacityValue * opacityLevel) * 255);
						}
					},
					assign: (texture) => {
						setStandardOpacityTexture(material, texture);

						if (built) {
							rebuildMaterial(scene, material);
						}
						built = true;
					},
				})
			);
		}
	} else {
		loadSlot(
			opacityData,
			(texture) => setStandardOpacityTexture(material, texture),
			(textureData) => {
				material.opacityLevel = textureData.level ?? 1;
				material.opacityFromRGB = textureData.getAlphaFromRGB ?? false;
			}
		);
	}

	loadSlot(
		data.reflectionTexture,
		(texture) => setStandardReflectionTexture(material, texture),
		(textureData) => {
			material.reflectionLevel = textureData.level ?? 1;
			material.reflectionCoordMode = textureData.coordinatesMode === 2 ? 2 : 1;
		}
	);

	const promise = Promise.all(promises).then(() => {
		if (hasTransform) {
			enableMaterialUvTransform(material);
		}
	});

	return { material, promise };
}
