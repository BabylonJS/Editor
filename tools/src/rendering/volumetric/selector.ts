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

import {
	IVolumetricLightConfiguration,
	IVolumetricLightingConfiguration,
	getVolumetricLightConfiguration,
	maxVolumetricArrayLights,
	maxVolumetricDirectionalLights,
	maxVolumetricShadowSlots,
} from "./types";

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
 * Defines how the transmittance of the medium is evaluated by the raymarching shader.
 */
export enum VolumetricTransmittanceMode {
	/**
	 * Closed form of the three fog modes, for a medium whose density doesn't depend on the altitude.
	 */
	Analytic = 0,
	/**
	 * Closed form of the exponential fog mode combined with the height falloff.
	 */
	AnalyticHeight = 1,
	/**
	 * Optical depth integrated numerically along the view ray, for the other fog modes combined with the
	 * height falloff, which have no closed form.
	 */
	Numeric = 2,
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
	/**
	 * Defines wether or not the light of the slot has a bounded volume (point and spot lights). Those are
	 * integrated only over the part of the view ray crossing their volume, the others along the whole ray.
	 */
	local: boolean;
}

/**
 * Defines the result of a selection pass.
 */
export interface IVolumetricLightSelection {
	shadowed: {
		candidate: IVolumetricLightCandidate;
		shadow: IVolumetricShadowSlot;
	}[];
	/**
	 * Defines the lights evaluated without a shadow map. The first "directionalCount" entries are the
	 * directional lights, the point and spot lights follow.
	 */
	unshadowed: IVolumetricLightCandidate[];
	/**
	 * Defines the number of directional lights at the start of "unshadowed".
	 */
	directionalCount: number;
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
	maxDirectionalLights: number;
	allowCsm: boolean;
}

/**
 * Defines how many uniform vectors each kind of light costs in the raymarching shader.
 */
const shadowedLightVectorCost = 10;
const arrayLightVectorCost = 4;
const csmVectorCost = 6 + 4 * 4;

/**
 * Defines how many uniform vectors are used by the camera, the medium and the fog, plus some headroom for the driver.
 */
const fixedVectorCost = 32;

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

	// WebGPU reports the size of its uniform buffer in floats rather than in vec4, unlike WebGL 2 whose
	// MAX_FRAGMENT_UNIFORM_VECTORS really is a vector count.
	const reportedVectors = caps.maxFragmentUniformVectors || 224;
	const availableVectors = engine.isWebGPU ? Math.floor(reportedVectors / 4) : reportedVectors;

	const vectorBudget = Math.max(224, availableVectors) - fixedVectorCost;
	// Only "textureSampler", which holds the linear depth of the scene, is always bound.
	const samplerBudget = Math.max(8, caps.maxTexturesImageUnits || 16) - 1;

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

	return {
		maxShadowSlots,
		maxArrayLights,
		maxDirectionalLights: Math.min(maxVolumetricDirectionalLights, maxArrayLights),
		allowCsm,
	};
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
	const local = !isDirectionalLight(light);

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
				local,
			};

		case ShadowGenerator.FILTER_EXPONENTIALSHADOWMAP:
		case ShadowGenerator.FILTER_BLUREXPONENTIALSHADOWMAP:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.Esm, packed, mapSize, local };

		case ShadowGenerator.FILTER_CLOSEEXPONENTIALSHADOWMAP:
		case ShadowGenerator.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.CloseEsm, packed, mapSize, local };

		default:
			return { generator, kind: isCube ? VolumetricShadowKind.Cube : VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.Standard, packed, mapSize, local };
	}
}

/**
 * Returns the world position of the given light, taking its parent into account.
 * @param light defines the reference to the light to get its position.
 * @param result defines the vector the position is written to.
 */
export function getVolumetricLightWorldPosition(light: Light, result: Vector3): Vector3 {
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

/**
 * Returns the normalized world direction of the given light, taking its parent into account.
 * @param light defines the reference to the light to get its direction.
 * @param result defines the vector the direction is written to.
 */
export function getVolumetricLightWorldDirection(light: Light, result: Vector3): Vector3 {
	const anyLight = light as any;

	if (anyLight.computeTransformedInformation?.() && anyLight.transformedDirection) {
		result.copyFrom(anyLight.transformedDirection);
	} else if (anyLight.direction) {
		result.copyFrom(anyLight.direction);
	} else {
		result.copyFromFloats(0, 0, 1);
	}

	return result.normalize();
}

/**
 * Returns the radius of the volume reached by the given light, as used by the raymarching shader.
 * "Light.range" defaults to Number.MAX_VALUE, anything past the reach of the march means no attenuation at all.
 * @param light defines the reference to the light to get its radius.
 * @param config defines the volumetric configuration of the light.
 * @param configuration defines the configuration of the pipeline.
 */
export function getVolumetricLightRange(light: Light, config: IVolumetricLightConfiguration, configuration: IVolumetricLightingConfiguration): number {
	const range = light.range > 0 && light.range < Number.MAX_VALUE ? light.range : configuration.maxDistance;
	return Math.max(1e-3, Math.min(range * config.rangeMultiplier, 3.4e38));
}

const temporaryPosition = new Vector3();
const temporaryDirection = new Vector3();

/**
 * Computes the sphere bounding the volume the given light can reach. A spot light only reaches the cone
 * that starts at its position, whose bounding sphere is much smaller than the sphere of its range.
 * @param light defines the reference to the light to bound.
 * @param range defines the radius of the volume reached by the light.
 * @param center defines the vector the center of the sphere is written to.
 * @returns the radius of the sphere.
 */
function computeVolumetricLightBounds(light: Light, range: number, center: Vector3): number {
	getVolumetricLightWorldPosition(light, center);

	if (!isSpotLight(light)) {
		return range;
	}

	// The smallest sphere containing the cone of half angle "a" cut by the sphere of the range is centered on
	// the axis, at "range / (2 cos(a))" of the apex, as long as that is closer than the range itself.
	const cosHalfAngle = Math.cos(light.angle * 0.5);
	if (cosHalfAngle <= 0.5) {
		return range;
	}

	const radius = range / (2 * cosHalfAngle);
	getVolumetricLightWorldDirection(light, temporaryDirection);
	center.addInPlace(temporaryDirection.scaleInPlace(radius));

	return radius;
}

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
 * Returns a number identifying the code the raymarching shader needs to read the given shadow map.
 */
function getShadowSlotSignature(shadow: IVolumetricShadowSlot): number {
	return (shadow.local ? 64 : 0) + shadow.kind * 16 + shadow.mode * 4 + (shadow.packed ? 1 : 0);
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
			const range = Math.min(getVolumetricLightRange(light, config, configuration), configuration.maxDistance);
			const radius = computeVolumetricLightBounds(light, range, temporaryPosition);

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

	// Explains why each light of the unshadowed tier doesn't use a shadow map, written as the lights are
	// classified so the shadow map of each light is only resolved once per selection.
	const unshadowedReasons = new Map<number, string>();

	let csm: IVolumetricLightSelection["csm"] = null;

	candidates.forEach((candidate) => {
		const { light, config } = candidate;

		if (!config.castVolumetricShadows) {
			unshadowedReasons.set(light.uniqueId, "occlusion is disabled on this light.");
			unshadowedCandidates.push(candidate);
			return;
		}

		if (candidate.isClustered) {
			unshadowedReasons.set(light.uniqueId, "clustered lighting doesn't support shadow maps.");
			unshadowedCandidates.push(candidate);
			return;
		}

		if (!light.shadowEnabled || !scene.shadowsEnabled) {
			unshadowedReasons.set(light.uniqueId, "shadows are disabled on this light or on the scene.");
			unshadowedCandidates.push(candidate);
			return;
		}

		const generator = light.getShadowGenerator(scene.activeCamera) ?? light.getShadowGenerator();

		if (!generator) {
			unshadowedReasons.set(light.uniqueId, "the light has no shadow generator.");
			unshadowedCandidates.push(candidate);
			return;
		}

		if (isCascadedShadowGenerator(generator) && budget.allowCsm) {
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

			unshadowedReasons.set(light.uniqueId, csm ? "another light already uses the single cascaded shadow map slot." : "its cascaded shadow map is not ready yet.");
			unshadowedCandidates.push(candidate);
			return;
		}

		const shadow = resolveVolumetricShadowSlot(light, scene);
		if (!shadow) {
			unshadowedReasons.set(light.uniqueId, "the shadow map of the light is not ready yet.");
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

	function getPreviousSlot(entry: { candidate: IVolumetricLightCandidate }): number {
		return previousSlots.get(entry.candidate.light.uniqueId) ?? Number.MAX_SAFE_INTEGER;
	}

	shadowedCandidates.sort((a, b) => {
		const difference = getHysteresisScore(b) - getHysteresisScore(a);
		if (difference !== 0) {
			return difference;
		}

		// Equal scores keep their previous slot, which keeps the generated shader identical.
		return getPreviousSlot(a) - getPreviousSlot(b);
	});

	const shadowed = shadowedCandidates.slice(0, budget.maxShadowSlots);

	// The code of each slot of the shader only depends on the kind of shadow map it reads, so ordering the
	// slots by kind makes the shader depend on how many shadow maps of each kind there are rather than on
	// which light uses which slot. Swapping two lights of the same kind then never recompiles anything.
	shadowed.sort((a, b) => getShadowSlotSignature(a.shadow) - getShadowSlotSignature(b.shadow) || getPreviousSlot(a) - getPreviousSlot(b));

	// Lights that don't fit in the shadowed tier fall back to the unshadowed one instead of disappearing.
	shadowedCandidates.slice(budget.maxShadowSlots).forEach((entry) => {
		unshadowedReasons.set(entry.candidate.light.uniqueId, "the shadowed lights budget is full.");
		unshadowedCandidates.push(entry.candidate);
	});

	unshadowedCandidates.sort((a, b) => b.score - a.score);

	// Directional lights light the whole view ray and are marched along it, the point and spot lights are
	// integrated over their own volume only. Both live in the same arrays, the directional ones first.
	const directional: IVolumetricLightCandidate[] = [];
	const local: IVolumetricLightCandidate[] = [];
	const dropped: { candidate: IVolumetricLightCandidate; reason: string }[] = [];

	unshadowedCandidates.forEach((candidate) => {
		if (isDirectionalLight(candidate.light)) {
			if (directional.length < budget.maxDirectionalLights) {
				directional.push(candidate);
			} else {
				dropped.push({
					candidate,
					reason: `Not rendered: at most ${budget.maxDirectionalLights} directional light(s) without a shadow map can take part in the effect.`,
				});
			}
		} else {
			local.push(candidate);
		}
	});

	const localCapacity = Math.max(0, budget.maxArrayLights - directional.length);

	local.slice(localCapacity).forEach((candidate) => {
		dropped.push({
			candidate,
			reason: 'Not rendered: the lights budget is full. Raise "Max Lights" or lower the priority of the other lights.',
		});
	});

	const unshadowed = directional.concat(local.slice(0, localCapacity));

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

		// Every light of this tier is occluded with the depth buffer instead of a shadow map when it asked
		// for it, so the wording only has to explain why the shadow map isn't the one being used.
		const occluded = candidate.config.castVolumetricShadows ? "Occluded using the depth buffer" : "Not occluded by the geometry";
		const reason = unshadowedReasons.get(candidate.light.uniqueId) ?? "the light has no shadow map.";

		stats.perLight.set(candidate.light.uniqueId, { state: "unshadowed", slot: -1, reason: `${occluded}: ${reason}` });
	});

	dropped.forEach(({ candidate, reason }) => {
		stats.droppedCount++;
		stats.perLight.set(candidate.light.uniqueId, { state: "dropped", slot: -1, reason });
	});

	return { shadowed, unshadowed, directionalCount: directional.length, csm, stats };
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
	transmittance: VolumetricTransmittanceMode;
	/**
	 * Defines wether or not the linear depth of the scene is packed in an 8 bits RGBA texture because the
	 * engine can't render to a float one.
	 */
	linearDepthPacked: boolean;
	/**
	 * Defines the size of the uniform arrays holding the lights evaluated without a shadow map. The number of
	 * lights actually stored in them is a uniform, which is what lets lights enter and leave the frustum of
	 * the camera without recompiling anything.
	 */
	arrayLightCapacity: number;
	/**
	 * Defines the number of steps the directional lights are marched with each frame. @see getVolumetricSamplingSteps
	 */
	steps: number;
	/**
	 * Defines the number of samples taken across the volume of each point and spot light each frame.
	 */
	lightSteps: number;
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
	const slots = selection.shadowed.map((entry) => `${entry.shadow.kind}.${entry.shadow.mode}.${entry.shadow.packed ? 1 : 0}.${entry.shadow.local ? 1 : 0}`).join("|");
	const csm = selection.csm ? `${selection.csm.kind}.${selection.csm.cascades}.${selection.csm.packed ? 1 : 0}` : "-";

	return [
		environment.steps,
		environment.lightSteps,
		configuration.stepDistribution,
		configuration.ditherMode,
		configuration.temporalJitter ? 1 : 0,
		configuration.temporalAccumulation ? 1 : 0,
		configuration.heightFogEnabled ? 1 : 0,
		configuration.lightExtinctionEnabled ? 1 : 0,
		configuration.pcfTaps,
		configuration.blurRadius,
		configuration.debugMode,
		configuration.screenSpaceShadows ? configuration.screenSpaceShadowSteps : 0,
		environment.fogMode,
		environment.transmittance,
		environment.depthMode,
		environment.ldrEncode ? 1 : 0,
		environment.reverseDepth ? 1 : 0,
		environment.ndcHalfZ ? 1 : 0,
		environment.linearDepthPacked ? 1 : 0,
		environment.arrayLightCapacity,
		selection.directionalCount,
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
