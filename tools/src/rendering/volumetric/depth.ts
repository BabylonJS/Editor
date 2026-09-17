import type { Scene } from "@babylonjs/core/scene";
import type { Nullable } from "@babylonjs/core/types";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { PrePassRenderer } from "@babylonjs/core/Rendering/prePassRenderer";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { GeometryBufferRenderer } from "@babylonjs/core/Rendering/geometryBufferRenderer";
import type { PrePassEffectConfiguration } from "@babylonjs/core/Rendering/prePassEffectConfiguration";

import { Constants } from "@babylonjs/core/Engines/constants";

/**
 * Defines the value of "GeometryBufferRenderer.DEPTH_TEXTURE_TYPE". Kept as a constant so reading the geometry
 * buffer doesn't import the geometry buffer renderer, and its scene component, in every exported project.
 */
const geometryBufferDepthTextureType = 0;

/**
 * Defines where the volumetric lighting rendering pipeline reads the depth of the scene from.
 */
export enum VolumetricDepthSource {
	/**
	 * A depth renderer, which renders every mesh of the scene a second time. Only used when the scene has
	 * neither a prepass renderer nor a geometry buffer renderer to read the depth from.
	 */
	DepthRenderer = 0,
	/**
	 * The depth texture of the geometry buffer renderer of the scene.
	 */
	GeometryBuffer = 1,
	/**
	 * The depth texture of the prepass renderer of the scene, written while the scene itself is drawn.
	 */
	PrePass = 2,
}

/**
 * Defines the name of the effect configuration the pipeline registers in the prepass renderer.
 */
export const volumetricLightingPrePassConfigurationName = "volumetricLighting";

/**
 * Creates the effect configuration asking the prepass renderer to write the view space depth of the scene.
 */
export function createVolumetricLightingPrePassConfiguration(): PrePassEffectConfiguration {
	return {
		name: volumetricLightingPrePassConfigurationName,
		enabled: false,
		texturesRequired: [Constants.PREPASS_DEPTH_TEXTURE_TYPE],
	};
}

/**
 * Returns the prepass renderer of the given scene, if one was enabled.
 * @param scene defines the reference to the scene to get its prepass renderer.
 */
export function getVolumetricPrePassRenderer(scene: Scene): Nullable<PrePassRenderer> {
	// The property only exists once the scene component of the prepass renderer is registered.
	return ((scene as any).prePassRenderer as Nullable<PrePassRenderer> | undefined) ?? null;
}

/**
 * Returns the geometry buffer renderer of the given scene, if one was enabled.
 * @param scene defines the reference to the scene to get its geometry buffer renderer.
 */
export function getVolumetricGeometryBufferRenderer(scene: Scene): Nullable<GeometryBufferRenderer> {
	// The property only exists once the scene component of the geometry buffer renderer is registered.
	return ((scene as any).geometryBufferRenderer as Nullable<GeometryBufferRenderer> | undefined) ?? null;
}

/**
 * Returns wether or not the prepass and geometry buffer renderers store the depth in a float texture. Both
 * fall back on 8 bits textures otherwise, which clamp the view space depth they write to [0, 1].
 * @param engine defines the reference to the engine to check.
 */
export function supportsVolumetricFloatDepthTexture(engine: AbstractEngine): boolean {
	const caps = engine.getCaps();
	return (caps.textureFloat && caps.textureFloatLinearFiltering) || (caps.textureHalfFloat && caps.textureHalfFloatLinearFiltering);
}

/**
 * Returns the cheapest source of the depth of the scene available: the prepass renderer writes the depth
 * while the scene is drawn and the geometry buffer renderer may already be rendered for another effect, both
 * of which save the additional rendering of every mesh of the scene a depth renderer costs.
 * @param scene defines the reference to the scene to read the depth of.
 */
export function resolveVolumetricDepthSource(scene: Scene): VolumetricDepthSource {
	if (!supportsVolumetricFloatDepthTexture(scene.getEngine())) {
		return VolumetricDepthSource.DepthRenderer;
	}

	if (getVolumetricPrePassRenderer(scene)?.isSupported) {
		return VolumetricDepthSource.PrePass;
	}

	if (getVolumetricGeometryBufferRenderer(scene)?.isSupported) {
		return VolumetricDepthSource.GeometryBuffer;
	}

	return VolumetricDepthSource.DepthRenderer;
}

/**
 * Returns the texture holding the view space depth of the scene written by the prepass renderer, or null
 * when the prepass renderer doesn't write it (yet).
 * @param prePassRenderer defines the reference to the prepass renderer to read the depth from.
 */
export function getVolumetricPrePassDepthTexture(prePassRenderer: PrePassRenderer): Nullable<Texture> {
	const index = prePassRenderer.getIndex(Constants.PREPASS_DEPTH_TEXTURE_TYPE);
	if (index === undefined || index < 0) {
		return null;
	}

	return prePassRenderer.getRenderTarget()?.textures?.[index] ?? null;
}

/**
 * Returns the texture holding the view space depth of the scene written by the geometry buffer renderer, or
 * null when the geometry buffer renderer doesn't write it.
 * @param geometryBufferRenderer defines the reference to the geometry buffer renderer to read the depth from.
 */
export function getVolumetricGeometryBufferDepthTexture(geometryBufferRenderer: GeometryBufferRenderer): Nullable<Texture> {
	if (!geometryBufferRenderer.enableDepth) {
		return null;
	}

	const index = geometryBufferRenderer.getTextureIndex(geometryBufferDepthTextureType);
	if (index < 0) {
		return null;
	}

	return geometryBufferRenderer.getGBuffer()?.textures?.[index] ?? null;
}
