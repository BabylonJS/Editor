import { Scene } from "@babylonjs/core/scene";
import { Light } from "@babylonjs/core/Lights/light";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Frustum } from "@babylonjs/core/Maths/math.frustum";
import { Constants } from "@babylonjs/core/Engines/constants";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";

import { isCascadedShadowGenerator, isShadowGenerator, isClusteredLightContainer, isDirectionalLight, isHemisphericLight, isPointLight, isSpotLight } from "../../tools/guards";

import { IVolumetricLightConfiguration, IVolumetricLightingConfiguration, getVolumetricLightConfiguration, maxVolumetricArrayLights, maxVolumetricShadowSlots } from "./types";

/**
 * Defines the type of sampler needed to read the shadow map of a light.
 */
export enum VolumetricShadowKind {
	/**
	 * Regular 2d texture storing the depth encoded in its color channels.
	 */
	Texture2D = 0,
	/**
	 * Hardware comparison sampler, used by the percentage closer filtering.
	 */
	Sampler2DShadow = 1,
	/**
	 * Cube texture storing the radial distance to the light, used by point lights.
	 */
	Cube = 2,
}

/**
 * Defines how the value stored in a shadow map must be interpreted.
 */
export enum VolumetricShadowMode {
	/**
	 * The shadow map stores the depth, the comparison is a simple "greater than".
	 */
	Standard = 0,
	/**
	 * The shadow map stores the exponential of the depth.
	 */
	Esm = 1,
	/**
	 * The shadow map stores the exponential of the depth, compared in the "close" space.
	 */
	CloseEsm = 2,
}

/**
 * Defines the state of a light regarding the volumetric lighting, as reported to the inspector.
 */
export type VolumetricLightState = "shadowed" | "unshadowed" | "culled" | "dropped" | "disabled";

/**
 * Defines the status of a light regarding the volumetric lighting.
 */
export interface IVolumetricLightStatus {
	/**
	 * Defines the state of the light. @see VolumetricLightState
	 */
	state: VolumetricLightState;
	/**
	 * Defines the index of the shadowed slot used by the light, or -1.
	 */
	slot: number;
	/**
	 * Defines a human readable explanation of the state, drawn in the inspector of the light.
	 */
	reason: string;
}

/**
 * Defines the statistics of the last selection pass of the volumetric lighting rendering pipeline.
 */
export interface IVolumetricLightingStats {
	/**
	 * Defines the number of lights of the scene that have volumetric lighting enabled.
	 */
	candidateCount: number;
	/**
	 * Defines the number of candidates that were outside the frustum of the camera.
	 */
	culledCount: number;
	/**
	 * Defines the number of candidates that got a shadowed slot.
	 */
	shadowedCount: number;
	/**
	 * Defines the number of candidates that contribute without casting volumetric shadows.
	 */
	unshadowedCount: number;
	/**
	 * Defines the number of candidates that didn't fit in the budget of the shader.
	 */
	droppedCount: number;
	/**
	 * Defines the status of each candidate, keyed by the unique id of the light.
	 */
	perLight: Map<number, IVolumetricLightStatus>;
}

/**
 * Defines a light of the scene that has volumetric lighting enabled.
 */
export interface IVolumetricLightCandidate {
	light: Light;
	config: IVolumetricLightConfiguration;
	isClustered: boolean;
	typeId: number;
	score: number;
}

/**
 * Defines the shadow map of a light, classified for the raymarching shader.
 */
export interface IVolumetricShadowSlot {
	generator: ShadowGenerator;
	kind: VolumetricShadowKind;
	mode: VolumetricShadowMode;
	packed: boolean;
	mapSize: number;
}

/**
 * Defines the result of a selection pass.
 */
export interface IVolumetricLightSelection {
	shadowed: {
		candidate: IVolumetricLightCandidate;
		shadow: IVolumetricShadowSlot;
	}[];
	unshadowed: IVolumetricLightCandidate[];
	csm: {
		candidate: IVolumetricLightCandidate;
		generator: CascadedShadowGenerator;
		cascades: number;
		kind: VolumetricShadowKind;
		packed: boolean;
	} | null;
	stats: IVolumetricLightingStats;
}

/**
 * Defines the number of lights the shader can be compiled for on the current engine.
 */
export interface IVolumetricBudget {
	maxShadowSlots: number;
	maxArrayLights: number;
	allowCsm: boolean;
}

/**
 * Defines how many uniform vectors each kind of light costs in the raymarching shader.
 */
const shadowedLightVectorCost = 10;
const arrayLightVectorCost = 4;
const csmVectorCost = 6 + 4 * 4;

/**
 * Defines the fraction of its own score a light already owning a shadowed slot gets as a bonus, which is
 * how much a challenger has to beat it by to take the slot over.
 */
const volumetricSlotHysteresis = 0.15;

/**
 * Computes the number of lights the raymarching shader can be compiled for, from the real capabilities
 * of the engine rather than from a hardcoded guess.
 * @param engine defines the reference to the engine to get its capabilities.
 * @param configuration defines the configuration of the pipeline, used as an upper bound.
 */
export function computeVolumetricBudget(engine: AbstractEngine, configuration: IVolumetricLightingConfiguration): IVolumetricBudget {
	const caps = engine.getCaps();

	// 20 vectors are used by the camera, the medium and the fog, 8 more are kept as headroom for the driver.
	const vectorBudget = Math.max(224, caps.maxFragmentUniformVectors || 224) - 28;
	// "textureSampler" and "depthSampler" are always bound.
	const samplerBudget = Math.max(8, caps.maxTexturesImageUnits || 16) - 2;

	const allowCsm = samplerBudget >= 2;
	const csmCost = allowCsm ? csmVectorCost : 0;

	const maxShadowSlots = Math.max(
		0,
		Math.min(maxVolumetricShadowSlots, configuration.maxShadowedLights, samplerBudget - (allowCsm ? 1 : 0), Math.floor((vectorBudget - csmCost) / shadowedLightVectorCost))
	);

	const maxArrayLights = Math.max(
		0,
		Math.min(maxVolumetricArrayLights, configuration.maxLights, Math.floor((vectorBudget - csmCost - maxShadowSlots * shadowedLightVectorCost) / arrayLightVectorCost))
	);

	return { maxShadowSlots, maxArrayLights, allowCsm };
}

/**
 * Returns the list of all the lights of the scene, including the ones that live inside a clustered light
 * container. Adding a light to a container removes it from "scene.lights", so walking "scene.lights" alone
 * misses exactly the lights this pipeline is meant to scale to.
 * @param scene defines the reference to the scene to get its lights.
 */
export function getAllVolumetricCandidateLights(scene: Scene): { light: Light; isClustered: boolean }[] {
	const result: { light: Light; isClustered: boolean }[] = [];

	scene.lights.forEach((light) => {
		if (isClusteredLightContainer(light)) {
			light.lights.forEach((clusteredLight) => {
				result.push({ light: clusteredLight, isClustered: true });
			});
		} else {
			result.push({ light, isClustered: false });
		}
	});

	return result;
}

/**
 * Returns the shadow generator of the given light classified for the raymarching shader, or null when the
 * light has no shadow map that can be sampled by the volumetric pass.
 * @param light defines the reference to the light to resolve its shadow map.
 * @param scene defines the reference to the scene the light belongs to.
 */
export function resolveVolumetricShadowSlot(light: Light, scene: Scene): IVolumetricShadowSlot | null {
	// Shadow generators can be scoped to a camera, the lookup without argument doesn't find those.
	const generator = light.getShadowGenerator(scene.activeCamera) ?? light.getShadowGenerator();
	if (!generator || !isShadowGenerator(generator)) {
		return null;
	}

	const shadowMap = generator.getShadowMapForRendering();
	if (!shadowMap?.isReady()) {
		return null;
	}

	const mapSize = generator.getShadowMap()?.getSize().width ?? 1024;
	const packed = shadowMap.textureType === Constants.TEXTURETYPE_UNSIGNED_BYTE;

	const isCube = (light as any).needCube?.() === true;

	// The setter of "filter" silently downgrades the value when the engine doesn't support it, read it back.
	switch (generator.filter) {
		case ShadowGenerator.FILTER_PCF:
		case ShadowGenerator.FILTER_PCSS:
			// Percentage closer soft shadows are downgraded to percentage closer filtering: a blocker search
			// per step of the raymarching is not affordable, and the march already averages dozens of samples.
			// A cube shadow map has no hardware comparison sampler, it keeps the regular decoding.
			return {
				generator,
				kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Sampler2DShadow,
				mode: VolumetricShadowMode.Standard,
				packed,
				mapSize,
			};

		case ShadowGenerator.FILTER_EXPONENTIALSHADOWMAP:
		case ShadowGenerator.FILTER_BLUREXPONENTIALSHADOWMAP:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.Esm, packed, mapSize };

		case ShadowGenerator.FILTER_CLOSEEXPONENTIALSHADOWMAP:
		case ShadowGenerator.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.CloseEsm, packed, mapSize };

		default:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.Standard, packed, mapSize };
	}
}

function getLightWorldPosition(light: Light, result: Vector3): Vector3 {
	const anyLight = light as any;

	if (anyLight.computeTransformedInformation?.() && anyLight.transformedPosition) {
		result.copyFrom(anyLight.transformedPosition);
	} else if (anyLight.position) {
		result.copyFrom(anyLight.position);
	} else {
		result.copyFromFloats(0, 0, 0);
	}

	return result;
}

function getVolumetricLightRadius(light: Light, config: IVolumetricLightConfiguration, configuration: IVolumetricLightingConfiguration): number {
	const range = light.range > 0 && isFinite(light.range) ? light.range : configuration.maxDistance;
	return Math.min(range * config.rangeMultiplier, configuration.maxDistance);
}

const temporaryPosition = new Vector3();

/**
 * Returns wether or not the sphere of influence of a light intersects the frustum of the camera.
 * @param center defines the center of the sphere, in world space.
 * @param radius defines the radius of the sphere.
 * @param planes defines the six planes of the frustum of the camera.
 */
function isSphereInFrustum(center: Vector3, radius: number, planes: Plane[]): boolean {
	// The normals returned by "Frustum.GetPlanes" point inwards, so a point inside gives a positive
	// distance. This is the same test as "BoundingSphere.isInFrustum".
	for (let i = 0; i < planes.length; ++i) {
		if (planes[i].dotCoordinate(center) <= -radius) {
			return false;
		}
	}

	return true;
}

/**
 * Selects the lights of the scene that contribute to the volumetric lighting for the given camera, splits
 * them between the shadowed and the unshadowed tiers of the shader and reports why each one ended where it did.
 * @param scene defines the reference to the scene to select the lights from.
 * @param camera defines the reference to the camera the pipeline is attached to.
 * @param configuration defines the configuration of the pipeline.
 * @param budget defines the number of lights the shader can be compiled for.
 * @param previous defines the result of the previous selection pass, used to keep the slots stable over time.
 */
export function selectVolumetricLights(
	scene: Scene,
	camera: Camera,
	configuration: IVolumetricLightingConfiguration,
	budget: IVolumetricBudget,
	previous: IVolumetricLightSelection | null
): IVolumetricLightSelection {
	const stats: IVolumetricLightingStats = {
		candidateCount: 0,
		culledCount: 0,
		shadowedCount: 0,
		unshadowedCount: 0,
		droppedCount: 0,
		perLight: new Map<number, IVolumetricLightStatus>(),
	};

	const frustumPlanes = Frustum.GetPlanes(scene.getTransformMatrix());
	const cameraPosition = camera.globalPosition;

	const candidates: IVolumetricLightCandidate[] = [];

	getAllVolumetricCandidateLights(scene).forEach(({ light, isClustered }) => {
		const config = getVolumetricLightConfiguration(light);
		if (!config?.enabled) {
			return;
		}

		stats.candidateCount++;

		if (isHemisphericLight(light) || !light.isEnabled() || light.intensity <= 0 || config.volumeIntensity <= 0) {
			stats.perLight.set(light.uniqueId, {
				state: "disabled",
				slot: -1,
				reason: isHemisphericLight(light)
					? "Hemispheric lights have no position nor direction and can't produce light shafts."
					: "The light is disabled or its intensity is zero.",
			});
			return;
		}

		const isDirectional = isDirectionalLight(light);
		let score = config.priority * 1e3;

		if (isDirectional) {
			// A directional light lights the whole scene, it is always the most important contributor.
			score += 1e6;
		} else {
			const radius = getVolumetricLightRadius(light, config, configuration);
			getLightWorldPosition(light, temporaryPosition);

			if (!isSphereInFrustum(temporaryPosition, radius, frustumPlanes)) {
				stats.culledCount++;
				stats.perLight.set(light.uniqueId, {
					state: "culled",
					slot: -1,
					reason: "The light is outside of the frustum of the camera and doesn't reach it.",
				});
				return;
			}

			const distance = Math.max(1, Vector3.Distance(temporaryPosition, cameraPosition) - radius);
			score += config.volumeIntensity * light.intensity * Math.min(4, radius / distance);
		}

		candidates.push({
			light,
			config,
			isClustered,
			typeId: light.getTypeID(),
			score,
		});
	});

	candidates.sort((a, b) => b.score - a.score);

	// A light that already owns a shadowed slot keeps it unless a challenger is clearly better. Without this
	// hysteresis, two lights with close scores would swap slots every frame and recompile the shader each time.
	const previousSlots = new Map<number, number>();
	previous?.shadowed.forEach((entry, index) => {
		previousSlots.set(entry.candidate.light.uniqueId, index);
	});

	const shadowedCandidates: { candidate: IVolumetricLightCandidate; shadow: IVolumetricShadowSlot }[] = [];
	const unshadowedCandidates: IVolumetricLightCandidate[] = [];

	let csm: IVolumetricLightSelection["csm"] = null;

	candidates.forEach((candidate) => {
		const { light, config } = candidate;

		const canBeShadowed = config.castVolumetricShadows && !candidate.isClustered && light.shadowEnabled && scene.shadowsEnabled;
		if (!canBeShadowed) {
			unshadowedCandidates.push(candidate);
			return;
		}

		const generator = light.getShadowGenerator(scene.activeCamera) ?? light.getShadowGenerator();

		if (generator && isCascadedShadowGenerator(generator) && budget.allowCsm) {
			const shadowMap = generator.getShadowMapForRendering();

			if (!csm && shadowMap?.isReady()) {
				csm = {
					candidate,
					generator,
					cascades: generator.numCascades,
					kind:
						generator.filter === ShadowGenerator.FILTER_PCF || generator.filter === ShadowGenerator.FILTER_PCSS
							? VolumetricShadowKind.Sampler2DShadow
							: VolumetricShadowKind.Texture2D,
					packed: shadowMap.textureType === Constants.TEXTURETYPE_UNSIGNED_BYTE,
				};
				return;
			}

			unshadowedCandidates.push(candidate);
			return;
		}

		const shadow = resolveVolumetricShadowSlot(light, scene);
		if (!shadow) {
			unshadowedCandidates.push(candidate);
			return;
		}

		shadowedCandidates.push({ candidate, shadow });
	});

	// A light that already owns a shadowed slot gets a bonus, so a challenger only takes the slot when it
	// is clearly better. Without it two lights with close scores would swap every frame and the shader
	// would be recompiled every frame.
	function getHysteresisScore(entry: { candidate: IVolumetricLightCandidate }): number {
		const score = entry.candidate.score;
		if (previousSlots.get(entry.candidate.light.uniqueId) === undefined) {
			return score;
		}

		// Additive so it stays a bonus for the negative scores a negative priority produces.
		return score + Math.abs(score) * volumetricSlotHysteresis;
	}

	shadowedCandidates.sort((a, b) => {
		const difference = getHysteresisScore(b) - getHysteresisScore(a);
		if (difference !== 0) {
			return difference;
		}

		// Equal scores keep their previous slot, which keeps the generated shader identical.
		const previousA = previousSlots.get(a.candidate.light.uniqueId) ?? Number.MAX_SAFE_INTEGER;
		const previousB = previousSlots.get(b.candidate.light.uniqueId) ?? Number.MAX_SAFE_INTEGER;

		return previousA - previousB;
	});

	const shadowed = shadowedCandidates.slice(0, budget.maxShadowSlots);

	// Lights that don't fit in the shadowed tier fall back to the unshadowed one instead of disappearing.
	shadowedCandidates.slice(budget.maxShadowSlots).forEach((entry) => {
		unshadowedCandidates.push(entry.candidate);
	});

	unshadowedCandidates.sort((a, b) => b.score - a.score);

	const unshadowed = unshadowedCandidates.slice(0, budget.maxArrayLights);
	const dropped = unshadowedCandidates.slice(budget.maxArrayLights);

	shadowed.forEach((entry, index) => {
		stats.shadowedCount++;
		stats.perLight.set(entry.candidate.light.uniqueId, {
			state: "shadowed",
			slot: index,
			reason: `Casting volumetric shadows using slot ${index + 1} of ${budget.maxShadowSlots}.`,
		});
	});

	if (csm) {
		const csmSelection = csm as NonNullable<IVolumetricLightSelection["csm"]>;

		stats.shadowedCount++;
		stats.perLight.set(csmSelection.candidate.light.uniqueId, {
			state: "shadowed",
			slot: -1,
			reason: `Casting volumetric shadows using its ${csmSelection.cascades} shadow cascades.`,
		});
	}

	unshadowed.forEach((candidate) => {
		stats.unshadowedCount++;

		const generator = candidate.light.getShadowGenerator(scene.activeCamera) ?? candidate.light.getShadowGenerator();

		// Every light of this tier is occluded with the depth buffer instead of a shadow map when it asked
		// for it, so the wording only has to explain why the shadow map isn't the one being used.
		const occluded = candidate.config.castVolumetricShadows ? "Occluded using the depth buffer" : "Not occluded by the geometry";

		let reason: string;
		if (!candidate.config.castVolumetricShadows) {
			reason = `${occluded}: occlusion is disabled on this light.`;
		} else if (candidate.isClustered) {
			reason = `${occluded}: clustered lighting doesn't support shadow maps.`;
		} else if (!scene.shadowsEnabled || !candidate.light.shadowEnabled) {
			reason = `${occluded}: shadows are disabled on this light or on the scene.`;
		} else if (!generator) {
			reason = `${occluded}: the light has no shadow generator.`;
		} else if (isCascadedShadowGenerator(generator)) {
			reason = csm ? `${occluded}: another light already uses the single cascaded shadow map slot.` : `${occluded}: its cascaded shadow map is not ready yet.`;
		} else if (!resolveVolumetricShadowSlot(candidate.light, scene)) {
			reason = `${occluded}: the shadow map of the light is not ready yet.`;
		} else {
			reason = `${occluded}: the shadowed lights budget is full.`;
		}

		stats.perLight.set(candidate.light.uniqueId, { state: "unshadowed", slot: -1, reason });
	});

	dropped.forEach((candidate) => {
		stats.droppedCount++;
		stats.perLight.set(candidate.light.uniqueId, {
			state: "dropped",
			slot: -1,
			reason: 'Not rendered: the lights budget is full. Raise "Max Lights" or lower the priority of the other lights.',
		});
	});

	return { shadowed, unshadowed, csm, stats };
}

/**
 * Defines everything that ends up in a "#define" of the raymarching shader. Any change to this key
 * requires the shader to be recompiled, everything else is a simple uniform update.
 */
export interface IVolumetricShaderEnvironment {
	depthMode: 0 | 1 | 2;
	ldrEncode: boolean;
	reverseDepth: boolean;
	ndcHalfZ: boolean;
	fogMode: number;
	analyticTransmittance: boolean;
}

/**
 * Computes a key that changes whenever the raymarching shader must be recompiled.
 * @param selection defines the result of the last selection pass.
 * @param configuration defines the configuration of the pipeline.
 * @param environment defines the state of the engine and of the scene the shader depends on.
 */
export function computeVolumetricShapeKey(
	selection: IVolumetricLightSelection,
	configuration: IVolumetricLightingConfiguration,
	environment: IVolumetricShaderEnvironment
): string {
	const slots = selection.shadowed.map((entry) => `${entry.shadow.kind}.${entry.shadow.mode}.${entry.shadow.packed ? 1 : 0}`).join("|");
	const csm = selection.csm ? `${selection.csm.kind}.${selection.csm.cascades}.${selection.csm.packed ? 1 : 0}` : "-";

	return [
		configuration.steps,
		configuration.stepDistribution,
		configuration.ditherMode,
		configuration.temporalJitter ? 1 : 0,
		configuration.heightFogEnabled ? 1 : 0,
		configuration.lightExtinctionEnabled ? 1 : 0,
		configuration.pcfTaps,
		configuration.blurRadius,
		configuration.debugMode,
		configuration.screenSpaceShadows ? configuration.screenSpaceShadowSteps : 0,
		environment.fogMode,
		environment.analyticTransmittance ? 1 : 0,
		environment.depthMode,
		environment.ldrEncode ? 1 : 0,
		environment.reverseDepth ? 1 : 0,
		environment.ndcHalfZ ? 1 : 0,
		selection.unshadowed.length,
		slots,
		csm,
	].join(",");
}

/**
 * Returns wether or not the given light can be used by the volumetric lighting rendering pipeline.
 * @param light defines the reference to the light to check.
 */
export function isVolumetricLightSupported(light: Light): boolean {
	return isPointLight(light) || isSpotLight(light) || isDirectionalLight(light);
}
