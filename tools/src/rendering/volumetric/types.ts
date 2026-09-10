import { Light } from "@babylonjs/core/Lights/light";

/**
 * Defines the key used to store the per-light volumetric lighting configuration in the metadata of a light.
 * Storing the configuration in the metadata of the light is what makes it survive the save/load round trip
 * for free (metadata is serialized by "Light.serialize" and restored by "Light.Parse") including for lights
 * that live inside a clustered light container and are, as a result, not part of "scene.lights" anymore.
 */
export const volumetricLightMetadataKey = "volumetricLighting";

/**
 * Defines the maximum number of shadowed lights the raymarching shader can be compiled for.
 * The effective count is computed at runtime from the capabilities of the engine.
 */
export const maxVolumetricShadowSlots = 8;

/**
 * Defines the maximum number of unshadowed lights the raymarching shader can be compiled for.
 * The effective count is computed at runtime from the capabilities of the engine.
 */
export const maxVolumetricArrayLights = 256;

/**
 * Defines the maximum number of unshadowed directional lights the raymarching shader evaluates. Unlike the
 * point and spot lights, a directional light lights the whole view ray, so each one costs a full march.
 */
export const maxVolumetricDirectionalLights = 4;

/**
 * Defines the available step distributions used while raymarching the participating medium.
 */
export enum VolumetricStepDistribution {
	/**
	 * All steps have the same length. Gives the best results for a medium that is mostly uniform.
	 */
	Linear = 0,
	/**
	 * Steps grow exponentially with the distance to the camera. Gives more precision near the camera
	 * where the perspective projection makes artifacts the most visible.
	 */
	Exponential = 1,
}

/**
 * Defines the available dithering modes used to hide the banding produced by a low step count.
 */
export enum VolumetricDitherMode {
	/**
	 * No dithering at all. Banding will be visible unless the step count is very high.
	 */
	None = 0,
	/**
	 * Static 4x4 ordered (Bayer) matrix. Stable over time, best when no temporal anti-aliasing is used.
	 */
	Bayer = 1,
	/**
	 * Interleaved gradient noise. Converges to the ground truth when temporal anti-aliasing is enabled.
	 */
	InterleavedGradientNoise = 2,
}

/**
 * Defines how the density of the participating medium evolves with the distance to the camera.
 * These are the same three models the fog of Babylon.js uses, but the volumetric lighting owns its own
 * values: the medium the light shafts are computed in is independent from the fog applied on the surfaces.
 */
export enum VolumetricFogMode {
	/**
	 * Uniform medium. The transmittance falls as e^(-distance * density).
	 */
	Exponential = 0,
	/**
	 * The medium gets denser with the distance. The transmittance falls as e^(-(distance * density)^2).
	 */
	ExponentialSquared = 1,
	/**
	 * The medium fades in linearly between "fogStart" and "fogEnd", which fully hides anything past the end.
	 */
	Linear = 2,
}

/**
 * Defines the available debug outputs of the volumetric lighting rendering pipeline.
 */
export enum VolumetricDebugMode {
	/**
	 * No debug, the scattering is composed over the scene color.
	 */
	None = 0,
	/**
	 * Outputs the raw in-scattering buffer.
	 */
	Scattering = 1,
	/**
	 * Outputs the transmittance of the medium.
	 */
	Transmittance = 2,
	/**
	 * Outputs a heat map of the number of lights evaluated per pixel.
	 */
	LightCount = 3,
}

/**
 * Defines the configuration of the volumetric lighting for a single light of the scene.
 * This is stored in "light.metadata.volumetricLighting".
 * All values must be JSON primitives so they survive the save/load round trip untouched.
 */
export interface IVolumetricLightConfiguration {
	/**
	 * Defines wether or not this light contributes to the volumetric lighting.
	 */
	enabled: boolean;
	/**
	 * Defines the multiplier applied to the intensity of the light for its volumetric contribution only.
	 * This allows tuning the shafts without changing how the light affects the surfaces of the scene.
	 */
	volumeIntensity: number;
	/**
	 * Defines the anisotropy (the "g" parameter of the Henyey-Greenstein phase function) of the medium for this light.
	 * 0 means isotropic scattering, positive values scatter forward (bright halo when looking at the light) and
	 * negative values scatter backward.
	 */
	anisotropy: number;
	/**
	 * Defines wether or not the volumetric contribution uses a custom color instead of the diffuse color of the light.
	 */
	useCustomColor: boolean;
	/**
	 * Defines the custom color, as a [r, g, b] array, used when "useCustomColor" is true.
	 */
	color: number[];
	/**
	 * Defines wether or not the light shafts are shadowed by the shadow map of the light.
	 * Requires the light to have a shadow generator. Lights that are part of a clustered light container
	 * can't cast volumetric shadows as clustered lighting doesn't support shadows at all.
	 */
	castVolumetricShadows: boolean;
	/**
	 * Defines the multiplier applied to the darkness of the shadow generator for the volumetric shadows only.
	 */
	shadowDarkness: number;
	/**
	 * Defines the multiplier applied to the range of the light when computing its volumetric influence radius.
	 * Has no effect on directional lights.
	 */
	rangeMultiplier: number;
	/**
	 * Defines the priority of the light when the number of lights of the scene exceeds the budget of the shader.
	 * Lights with a higher priority are kept first and are the first to get a shadowed slot.
	 */
	priority: number;
}

/**
 * Defines the configuration of the volumetric lighting rendering pipeline itself.
 */
export interface IVolumetricLightingConfiguration {
	/**
	 * Defines the number of steps used to raymarch the participating medium for the directional lights, and
	 * the minimum density of samples along the view ray for the point and spot lights.
	 */
	steps: number;
	/**
	 * Defines the number of samples taken across the volume of each point and spot light, when the view ray
	 * crosses it through its center. Each light is integrated only over the part of the view ray it can reach,
	 * so this is what drives the quality of the small lights, whatever their distance to the camera.
	 * 0 derives it from "steps".
	 */
	lightSteps: number;
	/**
	 * Defines the resolution of the scattering and blur passes relative to the resolution of the canvas.
	 */
	resolutionScale: number;
	/**
	 * Defines how the steps are distributed along the ray. @see VolumetricStepDistribution
	 */
	stepDistribution: VolumetricStepDistribution;
	/**
	 * Defines the dithering mode used to hide the banding produced by a low step count. @see VolumetricDitherMode
	 */
	ditherMode: VolumetricDitherMode;
	/**
	 * Defines the strength of the dithering applied to the starting offset of the rays.
	 */
	ditherStrength: number;
	/**
	 * Defines wether or not the dithering pattern is animated over time. Requires temporal anti-aliasing to converge.
	 */
	temporalJitter: boolean;

	/**
	 * Defines how the density of the medium evolves with the distance to the camera. @see VolumetricFogMode
	 */
	fogMode: VolumetricFogMode;
	/**
	 * Defines the extinction coefficient of the medium, per scene unit. The default is derived from the size
	 * of the scene when the effect is enabled, so the medium reads the same whatever unit the project uses.
	 * Not used by the linear mode, which is driven by "fogStart" and "fogEnd" instead.
	 */
	fogDensity: number;
	/**
	 * Defines the distance, in scene units, at which the medium starts in the linear mode.
	 */
	fogStart: number;
	/**
	 * Defines the distance, in scene units, at which the medium becomes fully opaque in the linear mode.
	 */
	fogEnd: number;
	/**
	 * Defines the color, as a [r, g, b] array, the medium scatters. This tints the light shafts the same way
	 * the color of a real fog tints what is seen through it.
	 */
	fogColor: number[];
	/**
	 * Defines the single-scattering albedo of the medium, in the [0, 1] range. This is the ratio of the
	 * extinction that is scattered instead of being absorbed. Keeping it under 1 guarantees energy conservation.
	 */
	albedo: number;
	/**
	 * Defines the maximum distance, in scene units, the rays are marched to.
	 */
	maxDistance: number;
	/**
	 * Defines wether or not the density of the medium decreases with the altitude.
	 */
	heightFogEnabled: boolean;
	/**
	 * Defines the altitude, in scene units, under which the medium has its full density.
	 */
	heightFogBaseHeight: number;
	/**
	 * Defines how fast the density of the medium decreases over the base height.
	 */
	heightFogFalloff: number;

	/**
	 * Defines the global multiplier applied to the in-scattering when it is composed over the scene color.
	 * 1 keeps the light shafts at the same intensity the lights use for the surfaces they hit.
	 */
	intensity: number;
	/**
	 * Defines wether or not the light is attenuated by the medium on its way from the light to the sample.
	 * This is what makes distant lights look correctly dimmed in a dense medium.
	 */
	lightExtinctionEnabled: boolean;
	/**
	 * Defines the maximum distance, in scene units, over which the light path extinction is clamped.
	 */
	lightExtinctionClamp: number;
	/**
	 * Defines how much the scene color is absorbed by the medium, in the [0, 1] range. Left at 0 the pipeline
	 * only adds the light shafts; raised, together with an ambient color, the medium becomes a fog of its own.
	 */
	extinctionAmount: number;
	/**
	 * Defines the constant ambient in-scattering color, as a [r, g, b] array, added at each step of the raymarching.
	 */
	ambientColor: number[];
	/**
	 * Defines the multiplier applied to the ambient in-scattering color.
	 */
	ambientIntensity: number;

	/**
	 * Defines wether or not the lights that have no shadow map are occluded using the depth buffer of the
	 * scene. Without it their light shafts are visible through the walls that stand between them and the
	 * camera, as nothing tells the raymarching that the light doesn't reach the medium it is crossing.
	 */
	screenSpaceShadows: boolean;
	/**
	 * Defines the number of samples taken along the segment between a point of the medium and the light when
	 * looking for an occluder in the depth buffer.
	 */
	screenSpaceShadowSteps: number;
	/**
	 * Defines how far behind a surface a sample has to be, as a fraction of its own distance to the camera,
	 * to count as occluded. Raise it if the light shafts show thin dark streaks over the geometry.
	 */
	screenSpaceShadowBias: number;
	/**
	 * Defines how far, in scene units, the search for an occluder walks towards the light. A directional
	 * light has no position to walk to, so this is what bounds its search. The default is derived from the
	 * size of the scene when the effect is enabled.
	 */
	screenSpaceShadowMaxDistance: number;
	/**
	 * Defines how thick a surface is assumed to be, as a multiple of its own distance to the camera. A sample
	 * further behind a surface than this is considered to have passed it rather than to be hidden by it,
	 * which stops the objects in the foreground from stamping their silhouette into the shafts behind them.
	 */
	screenSpaceShadowThickness: number;

	/**
	 * Defines the number of separable bilateral blur passes applied to the scattering buffer. 0, 1 or 2.
	 */
	blurPasses: number;
	/**
	 * Defines the radius, in texels, of the bilateral blur.
	 */
	blurRadius: number;
	/**
	 * Defines the depth difference over which the bilateral blur stops blurring, in normalized depth units.
	 */
	blurDepthThreshold: number;
	/**
	 * Defines the depth difference over which the upsampling stops interpolating, in normalized depth units.
	 */
	upsampleDepthThreshold: number;

	/**
	 * Defines the maximum number of unshadowed lights taking part in the effect. A point or a spot light only
	 * costs anything for the pixels whose view ray crosses its volume, so this is a safety limit rather than
	 * a performance setting. The effective value is clamped by the capabilities of the GPU.
	 */
	maxLights: number;
	/**
	 * Defines the maximum number of shadowed lights evaluated per step. Each one costs a texture unit.
	 */
	maxShadowedLights: number;
	/**
	 * Defines the number of taps used when sampling a hardware comparison shadow map. 1 or 4.
	 */
	pcfTaps: number;
	/**
	 * Defines the number of frames between two refreshes of the list of lights contributing to the effect.
	 */
	selectionRefreshRate: number;

	/**
	 * Defines the debug output of the pipeline. @see VolumetricDebugMode
	 */
	debugMode: VolumetricDebugMode;
}

/**
 * Returns the default volumetric lighting configuration of a light.
 */
export function getDefaultVolumetricLightConfiguration(): IVolumetricLightConfiguration {
	return {
		enabled: false,
		volumeIntensity: 1,
		anisotropy: 0.35,
		useCustomColor: false,
		color: [1, 1, 1],
		castVolumetricShadows: true,
		shadowDarkness: 1,
		rangeMultiplier: 1,
		priority: 0,
	};
}

/**
 * Returns the default configuration of the volumetric lighting rendering pipeline.
 */
export function getDefaultVolumetricLightingConfiguration(): IVolumetricLightingConfiguration {
	return {
		steps: 40,
		lightSteps: 0,
		resolutionScale: 0.5,
		stepDistribution: VolumetricStepDistribution.Exponential,
		ditherMode: VolumetricDitherMode.InterleavedGradientNoise,
		ditherStrength: 1,
		temporalJitter: false,

		fogMode: VolumetricFogMode.Exponential,
		fogDensity: 0.0005,
		fogStart: 0,
		fogEnd: 2000,
		fogColor: [1, 1, 1],
		albedo: 1,
		maxDistance: 10_000,
		heightFogEnabled: false,
		heightFogBaseHeight: 0,
		heightFogFalloff: 0.01,

		intensity: 1.5,
		lightExtinctionEnabled: true,
		lightExtinctionClamp: 1000,
		extinctionAmount: 0,
		ambientColor: [1, 1, 1],
		ambientIntensity: 0,

		screenSpaceShadows: true,
		screenSpaceShadowSteps: 6,
		screenSpaceShadowBias: 0.02,
		screenSpaceShadowMaxDistance: 2000,
		screenSpaceShadowThickness: 4,

		blurPasses: 2,
		blurRadius: 3,
		blurDepthThreshold: 0.02,
		upsampleDepthThreshold: 0.02,

		maxLights: 128,
		maxShadowedLights: 4,
		pcfTaps: 4,
		selectionRefreshRate: 2,

		debugMode: VolumetricDebugMode.None,
	};
}

/**
 * Returns the number of samples taken across the volume of each point and spot light, resolving the
 * automatic value derived from the number of steps of the raymarching.
 * @param configuration defines the configuration of the pipeline.
 */
export function getVolumetricLightSteps(configuration: IVolumetricLightingConfiguration): number {
	if (configuration.lightSteps > 0) {
		return configuration.lightSteps;
	}

	return Math.max(4, Math.min(64, Math.round(configuration.steps * 0.3)));
}

function normalizeNumber(value: any, defaultValue: number, min: number, max: number): number {
	const result = typeof value === "number" && isFinite(value) ? value : defaultValue;
	return Math.min(max, Math.max(min, result));
}

function normalizeColor(value: any, defaultValue: number[]): number[] {
	if (!Array.isArray(value) || value.length < 3) {
		return defaultValue.slice();
	}

	return [normalizeNumber(value[0], defaultValue[0], 0, 100), normalizeNumber(value[1], defaultValue[1], 0, 100), normalizeNumber(value[2], defaultValue[2], 0, 100)];
}

/**
 * Normalizes the given serialized per-light volumetric configuration by merging it over the default one.
 * This is what makes projects saved by an older version of the editor load without any migration step.
 * @param data defines the serialized configuration to normalize.
 */
export function normalizeVolumetricLightConfiguration(data: any): IVolumetricLightConfiguration {
	const defaults = getDefaultVolumetricLightConfiguration();
	if (!data || typeof data !== "object") {
		return defaults;
	}

	return {
		enabled: data.enabled ?? defaults.enabled,
		volumeIntensity: normalizeNumber(data.volumeIntensity, defaults.volumeIntensity, 0, 1000),
		anisotropy: normalizeNumber(data.anisotropy, defaults.anisotropy, -0.95, 0.95),
		useCustomColor: data.useCustomColor ?? defaults.useCustomColor,
		color: normalizeColor(data.color, defaults.color),
		castVolumetricShadows: data.castVolumetricShadows ?? defaults.castVolumetricShadows,
		shadowDarkness: normalizeNumber(data.shadowDarkness, defaults.shadowDarkness, 0, 1),
		rangeMultiplier: normalizeNumber(data.rangeMultiplier, defaults.rangeMultiplier, 0, 100),
		priority: normalizeNumber(data.priority, defaults.priority, -1000, 1000),
	};
}

/**
 * Normalizes the given serialized pipeline configuration by merging it over the default one.
 * @param data defines the serialized configuration to normalize.
 */
export function normalizeVolumetricLightingConfiguration(data: any): IVolumetricLightingConfiguration {
	const defaults = getDefaultVolumetricLightingConfiguration();
	if (!data || typeof data !== "object") {
		return defaults;
	}

	return {
		steps: Math.round(normalizeNumber(data.steps, defaults.steps, 4, 256)),
		lightSteps: Math.round(normalizeNumber(data.lightSteps, defaults.lightSteps, 0, 128)),
		resolutionScale: normalizeNumber(data.resolutionScale, defaults.resolutionScale, 0.1, 1),
		stepDistribution: Math.round(normalizeNumber(data.stepDistribution, defaults.stepDistribution, 0, 1)),
		ditherMode: Math.round(normalizeNumber(data.ditherMode, defaults.ditherMode, 0, 2)),
		ditherStrength: normalizeNumber(data.ditherStrength, defaults.ditherStrength, 0, 1),
		temporalJitter: data.temporalJitter ?? defaults.temporalJitter,

		fogMode: Math.round(normalizeNumber(data.fogMode, defaults.fogMode, 0, 2)),
		fogDensity: normalizeNumber(data.fogDensity, defaults.fogDensity, 0, 100),
		fogStart: normalizeNumber(data.fogStart, defaults.fogStart, 0, 1_000_000),
		// The linear mode divides by "fogEnd - fogStart" and its extinction has a pole at "fogEnd", so an end
		// at or before the start would make the medium either vanish or turn instantly opaque.
		fogEnd: Math.max(normalizeNumber(data.fogEnd, defaults.fogEnd, 0, 10_000_000), normalizeNumber(data.fogStart, defaults.fogStart, 0, 1_000_000) + 1e-3),
		fogColor: normalizeColor(data.fogColor, defaults.fogColor),
		albedo: normalizeNumber(data.albedo, defaults.albedo, 0, 1),
		maxDistance: normalizeNumber(data.maxDistance, defaults.maxDistance, 1, 1_000_000),
		heightFogEnabled: data.heightFogEnabled ?? defaults.heightFogEnabled,
		heightFogBaseHeight: normalizeNumber(data.heightFogBaseHeight, defaults.heightFogBaseHeight, -1_000_000, 1_000_000),
		heightFogFalloff: normalizeNumber(data.heightFogFalloff, defaults.heightFogFalloff, 0, 10),

		intensity: normalizeNumber(data.intensity, defaults.intensity, 0, 100),
		lightExtinctionEnabled: data.lightExtinctionEnabled ?? defaults.lightExtinctionEnabled,
		lightExtinctionClamp: normalizeNumber(data.lightExtinctionClamp, defaults.lightExtinctionClamp, 0, 1_000_000),
		extinctionAmount: normalizeNumber(data.extinctionAmount, defaults.extinctionAmount, 0, 1),
		ambientColor: normalizeColor(data.ambientColor, defaults.ambientColor),
		ambientIntensity: normalizeNumber(data.ambientIntensity, defaults.ambientIntensity, 0, 100),

		screenSpaceShadows: data.screenSpaceShadows ?? defaults.screenSpaceShadows,
		screenSpaceShadowSteps: Math.round(normalizeNumber(data.screenSpaceShadowSteps, defaults.screenSpaceShadowSteps, 1, 32)),
		screenSpaceShadowBias: normalizeNumber(data.screenSpaceShadowBias, defaults.screenSpaceShadowBias, 0, 1),
		screenSpaceShadowMaxDistance: normalizeNumber(data.screenSpaceShadowMaxDistance, defaults.screenSpaceShadowMaxDistance, 1, 10_000_000),
		screenSpaceShadowThickness: normalizeNumber(data.screenSpaceShadowThickness, defaults.screenSpaceShadowThickness, 0.01, 1000),

		blurPasses: Math.round(normalizeNumber(data.blurPasses, defaults.blurPasses, 0, 2)),
		blurRadius: Math.round(normalizeNumber(data.blurRadius, defaults.blurRadius, 1, 6)),
		blurDepthThreshold: normalizeNumber(data.blurDepthThreshold, defaults.blurDepthThreshold, 0.0001, 1),
		upsampleDepthThreshold: normalizeNumber(data.upsampleDepthThreshold, defaults.upsampleDepthThreshold, 0.0001, 1),

		maxLights: Math.round(normalizeNumber(data.maxLights, defaults.maxLights, 0, maxVolumetricArrayLights)),
		maxShadowedLights: Math.round(normalizeNumber(data.maxShadowedLights, defaults.maxShadowedLights, 0, maxVolumetricShadowSlots)),
		pcfTaps: normalizeNumber(data.pcfTaps, defaults.pcfTaps, 1, 4) >= 4 ? 4 : 1,
		selectionRefreshRate: Math.round(normalizeNumber(data.selectionRefreshRate, defaults.selectionRefreshRate, 1, 60)),

		debugMode: Math.round(normalizeNumber(data.debugMode, defaults.debugMode, 0, 3)),
	};
}

/**
 * Keeps the configurations that were already completed with the default values, so the selection pass of
 * the pipeline, which reads the configuration of every light a few times per second, doesn't allocate.
 */
const completedVolumetricLightConfigurations = new WeakSet<object>();

/**
 * Returns the volumetric lighting configuration stored in the metadata of the given light and creates
 * it using the default values if it doesn't exist yet.
 *
 * The object stored in the metadata is completed in place instead of being replaced: the inspector and the
 * undo/redo stack keep references on it, and replacing it would silently break them.
 * @param light defines the reference to the light to ensure its volumetric lighting configuration.
 */
export function ensureVolumetricLightConfiguration(light: Light): IVolumetricLightConfiguration {
	light.metadata ??= {};

	const existing = light.metadata[volumetricLightMetadataKey];
	if (!existing || typeof existing !== "object") {
		light.metadata[volumetricLightMetadataKey] = normalizeVolumetricLightConfiguration(null);
		completedVolumetricLightConfigurations.add(light.metadata[volumetricLightMetadataKey]);
		return light.metadata[volumetricLightMetadataKey];
	}

	if (completedVolumetricLightConfigurations.has(existing)) {
		return existing;
	}

	// Fills the keys a newer version of the editor may have added since the project was saved.
	const defaults = getDefaultVolumetricLightConfiguration();
	Object.keys(defaults).forEach((key) => {
		if (existing[key] === undefined) {
			existing[key] = (defaults as any)[key];
		}
	});

	completedVolumetricLightConfigurations.add(existing);

	return existing;
}

/**
 * Returns the volumetric lighting configuration stored in the metadata of the given light, if any.
 * @param light defines the reference to the light to get its volumetric lighting configuration.
 */
export function getVolumetricLightConfiguration(light: Light): IVolumetricLightConfiguration | null {
	const data = light.metadata?.[volumetricLightMetadataKey];
	return data && typeof data === "object" ? ensureVolumetricLightConfiguration(light) : null;
}

/**
 * Returns wether or not the given light contributes to the volumetric lighting.
 * @param light defines the reference to the light to check.
 */
export function isVolumetricLightEnabled(light: Light): boolean {
	return light.metadata?.[volumetricLightMetadataKey]?.enabled === true;
}
