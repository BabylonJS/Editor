import { Camera, EngineContext, LightBase, SceneContext, ShadowGenerator } from "@babylonjs/lite";

import { getSceneData } from "../../tools/scene";
import { isNodeEnabled } from "../../tools/node";
import { isDirectionalLight, isHemisphericLight, isLight, isPointLight, isSpotLight } from "../../tools/guards";

import { getShadowGeneratorInfo } from "../../loading/shadows";
import { _getSerializedLightData, ClusteredLightNode, isClusteredLightNode } from "../../loading/light";

import {
	IVolumetricLightConfiguration,
	IVolumetricLightingConfiguration,
	getVolumetricLightConfiguration,
	maxVolumetricArrayLights,
	maxVolumetricDirectionalLights,
	maxVolumetricShadowSlots,
} from "./types";

/**
 * Defines a light that can take part in the volumetric lighting: a light of Babylon Lite or the node of a clustered
 * light created by the tools (see `ClusteredLightNode`).
 */
export type VolumetricLight = LightBase | ClusteredLightNode;

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
	 * Cube texture storing the radial distance to the light, used by point lights. Babylon Lite has no shadows for
	 * the point lights: kept for compatibility with the Babylon.js version of the tools.
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
	light: VolumetricLight;
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
		generator: ShadowGenerator;
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
 * Computes the number of lights the raymarching shader can be compiled for, from the real limits of the GPU device
 * rather than from a hardcoded guess.
 * @param engine defines the reference to the engine to get the limits of its GPU device.
 * @param configuration defines the configuration of the pipeline, used as an upper bound.
 */
export function computeVolumetricBudget(engine: EngineContext | null, configuration: IVolumetricLightingConfiguration): IVolumetricBudget {
	const limits = (engine as { _device?: GPUDevice } | null)?._device?.limits;

	// Same as the Babylon.js version on WebGPU, where the size of the uniform buffer drives the number of vectors.
	const availableVectors = Math.floor((limits?.maxUniformBufferBindingSize ?? 65536) / 16);
	const vectorBudget = Math.max(224, availableVectors) - fixedVectorCost;

	// Only the texture holding the depth of the scene is always bound.
	const samplerBudget = Math.max(8, limits?.maxSampledTexturesPerShaderStage ?? 16) - 1;

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
 * Returns the list of all the lights of the scene, including the lights of the clustered light container (Babylon
 * Lite clustered lights are plain data: the tools create a node for each of them, see `ClusteredLightNode`).
 * @param scene defines the reference to the scene to get its lights.
 */
export function getAllVolumetricCandidateLights(scene: SceneContext): { light: VolumetricLight; isClustered: boolean }[] {
	const result: { light: VolumetricLight; isClustered: boolean }[] = [];

	getSceneData(scene).lights.forEach((light) => {
		if (isClusteredLightNode(light)) {
			result.push({ light, isClustered: true });
		} else if (isLight(light)) {
			result.push({ light, isClustered: false });
		}
	});

	return result;
}

/**
 * Returns the type of the given light as Babylon.js does ("Light.getTypeID"): 0 for the point lights, 1 for the
 * directional lights, 2 for the spot lights and 3 for the hemispheric lights.
 * @param light defines the reference to the light to get its type.
 */
export function getVolumetricLightTypeId(light: VolumetricLight): number {
	if (isClusteredLightNode(light)) {
		return (light.clusteredLight as { angle?: number }).angle !== undefined ? 2 : 0;
	}

	if (isDirectionalLight(light)) {
		return 1;
	}

	if (isSpotLight(light)) {
		return 2;
	}

	return isHemisphericLight(light) ? 3 : 0;
}

/**
 * Returns the intensity of the given light scaled as Babylon.js does ("Light.getScaledIntensity") according to the
 * intensity mode the light was saved with.
 * @param light defines the reference to the light to get its intensity.
 */
export function getVolumetricLightScaledIntensity(light: VolumetricLight): number {
	const data = _getSerializedLightData(light);
	const typeId = getVolumetricLightTypeId(light);
	const intensity = (light as { intensity: number }).intensity;

	// Same as "Light._getPhotometricScale" of Babylon.js: 0 automatic, 1 luminous power, 2 luminous intensity,
	// 3 illuminance and 4 luminance.
	let mode = data?.intensityMode ?? 0;
	if (mode === 0) {
		mode = typeId === 1 ? 3 : 2;
	}

	const radius = data?.radius ?? 0.00001;

	let scale = 0;
	switch (typeId) {
		case 0:
		case 2:
			if (mode === 1) {
				scale = 1 / (4 * Math.PI);
			} else if (mode === 2) {
				scale = 1;
			} else if (mode === 4) {
				scale = radius * radius;
			}
			break;

		case 1:
			if (mode === 3) {
				scale = 1;
			} else if (mode === 4) {
				scale = 2 * Math.PI * (1 - Math.cos(Math.max(radius, 0.001)));
			}
			break;

		default:
			scale = 1;
			break;
	}

	return intensity * scale;
}

/**
 * Returns the exponent of the given spot light, as used by Babylon.js to attenuate the light from the axis of its cone.
 * @param light defines the reference to the spot light.
 */
export function getVolumetricSpotLightExponent(light: VolumetricLight): number {
	if (isClusteredLightNode(light)) {
		return _getSerializedLightData(light)?.exponent ?? 1;
	}

	return (light as { exponent?: number }).exponent ?? 1;
}

/**
 * Returns the full angle, in radians, of the cone of the given spot light.
 * @param light defines the reference to the spot light.
 */
export function getVolumetricSpotLightAngle(light: VolumetricLight): number {
	return (light as { angle?: number }).angle ?? Math.PI / 2;
}

/**
 * Returns the world position of the given light, taking its parent into account.
 * @param light defines the reference to the light to get its position.
 * @param result defines the array the position is written to.
 */
export function getVolumetricLightWorldPosition(light: VolumetricLight, result: number[]): number[] {
	const world = light.worldMatrix;

	result[0] = world[12];
	result[1] = world[13];
	result[2] = world[14];

	return result;
}

/**
 * Returns the normalized world direction of the given light, taking its parent into account.
 * @param light defines the reference to the light to get its direction.
 * @param result defines the array the direction is written to.
 */
export function getVolumetricLightWorldDirection(light: VolumetricLight, result: number[]): number[] {
	const world = light.worldMatrix;
	const direction = (light as { direction?: { x: number; y: number; z: number } }).direction ?? { x: 0, y: 0, z: 1 };

	const x = world[0] * direction.x + world[4] * direction.y + world[8] * direction.z;
	const y = world[1] * direction.x + world[5] * direction.y + world[9] * direction.z;
	const z = world[2] * direction.x + world[6] * direction.y + world[10] * direction.z;

	const length = Math.hypot(x, y, z) || 1;

	result[0] = x / length;
	result[1] = y / length;
	result[2] = z / length;

	return result;
}

/**
 * Returns the radius of the volume reached by the given light, as used by the raymarching shader.
 * "Light.range" defaults to Number.MAX_VALUE, anything past the reach of the march means no attenuation at all.
 * @param light defines the reference to the light to get its radius.
 * @param config defines the volumetric configuration of the light.
 * @param configuration defines the configuration of the pipeline.
 */
export function getVolumetricLightRange(light: VolumetricLight, config: IVolumetricLightConfiguration, configuration: IVolumetricLightingConfiguration): number {
	const lightRange = (light as { range?: number }).range ?? Number.MAX_VALUE;
	const range = lightRange > 0 && lightRange < Number.MAX_VALUE ? lightRange : configuration.maxDistance;

	return Math.max(1e-3, Math.min(range * config.rangeMultiplier, 3.4e38));
}

const temporaryPosition: number[] = [0, 0, 0];
const temporaryDirection: number[] = [0, 0, 0];

/**
 * Computes the sphere bounding the volume the given light can reach. A spot light only reaches the cone
 * that starts at its position, whose bounding sphere is much smaller than the sphere of its range.
 * @param light defines the reference to the light to bound.
 * @param range defines the radius of the volume reached by the light.
 * @param center defines the array the center of the sphere is written to.
 * @returns the radius of the sphere.
 */
function computeVolumetricLightBounds(light: VolumetricLight, range: number, center: number[]): number {
	getVolumetricLightWorldPosition(light, center);

	if (getVolumetricLightTypeId(light) !== 2) {
		return range;
	}

	// The smallest sphere containing the cone of half angle "a" cut by the sphere of the range is centered on
	// the axis, at "range / (2 cos(a))" of the apex, as long as that is closer than the range itself.
	const cosHalfAngle = Math.cos(getVolumetricSpotLightAngle(light) * 0.5);
	if (cosHalfAngle <= 0.5) {
		return range;
	}

	const radius = range / (2 * cosHalfAngle);
	getVolumetricLightWorldDirection(light, temporaryDirection);

	center[0] += temporaryDirection[0] * radius;
	center[1] += temporaryDirection[1] * radius;
	center[2] += temporaryDirection[2] * radius;

	return radius;
}

/**
 * Returns the six planes of the frustum described by the given view projection matrix (column major, WebGPU clip space
 * with the reversed depth of Babylon Lite), with their normals pointing inwards.
 * @param viewProjection defines the view projection matrix of the camera.
 */
export function getVolumetricFrustumPlanes(viewProjection: ArrayLike<number>): number[][] {
	const row = (index: number) => [viewProjection[index], viewProjection[4 + index], viewProjection[8 + index], viewProjection[12 + index]];

	const r0 = row(0);
	const r1 = row(1);
	const r2 = row(2);
	const r3 = row(3);

	const planes = [
		r3.map((v, i) => v + r0[i]),
		r3.map((v, i) => v - r0[i]),
		r3.map((v, i) => v + r1[i]),
		r3.map((v, i) => v - r1[i]),
		// Reversed depth: the near plane is at 1 and the far plane at 0.
		r3.map((v, i) => v - r2[i]),
		r2.slice(),
	];

	return planes.map((plane) => {
		const length = Math.hypot(plane[0], plane[1], plane[2]) || 1;
		return plane.map((v) => v / length);
	});
}

/**
 * Returns wether or not the sphere of influence of a light intersects the frustum of the camera.
 * @param center defines the center of the sphere, in world space.
 * @param radius defines the radius of the sphere.
 * @param planes defines the six planes of the frustum of the camera (see `getVolumetricFrustumPlanes`).
 */
function isSphereInFrustum(center: number[], radius: number, planes: number[][]): boolean {
	for (let i = 0; i < planes.length; ++i) {
		const plane = planes[i];
		if (plane[0] * center[0] + plane[1] * center[1] + plane[2] * center[2] + plane[3] <= -radius) {
			return false;
		}
	}

	return true;
}

/**
 * Returns the shadow generator of the given light classified for the raymarching shader, or null when the
 * light has no shadow map that can be sampled by the volumetric pass.
 * @param light defines the reference to the light to resolve its shadow map.
 */
export function resolveVolumetricShadowSlot(light: VolumetricLight): IVolumetricShadowSlot | null {
	const generator = isClusteredLightNode(light) ? undefined : (light as LightBase).shadowGenerator;
	if (!generator) {
		return null;
	}

	const internal = generator as { _shadowType?: string; _depthTexture?: GPUTexture; _config?: { _mapSize?: number } };
	if (!internal._depthTexture) {
		return null;
	}

	const mapSize = internal._config?._mapSize ?? internal._depthTexture.width;
	const local = !isDirectionalLight(light);

	switch (internal._shadowType) {
		case "pcf":
			return { generator, kind: VolumetricShadowKind.Sampler2DShadow, mode: VolumetricShadowMode.Standard, packed: false, mapSize, local };

		// The exponential shadow maps of Babylon Lite (directional lights only) store "exp(-depthScale * depth)".
		case "esm":
			return { generator, kind: VolumetricShadowKind.Texture2D, mode: VolumetricShadowMode.Esm, packed: false, mapSize, local };

		default:
			return null;
	}
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
 * @param viewProjection defines the view projection matrix of the camera.
 * @param configuration defines the configuration of the pipeline.
 * @param budget defines the number of lights the shader can be compiled for.
 * @param previous defines the result of the previous selection pass, used to keep the slots stable over time.
 */
export function selectVolumetricLights(
	scene: SceneContext,
	camera: Camera,
	viewProjection: ArrayLike<number>,
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

	const frustumPlanes = getVolumetricFrustumPlanes(viewProjection);
	const cameraWorld = camera.worldMatrix;

	const candidates: IVolumetricLightCandidate[] = [];

	getAllVolumetricCandidateLights(scene).forEach(({ light, isClustered }) => {
		const config = getVolumetricLightConfiguration(light);
		if (!config?.enabled) {
			return;
		}

		stats.candidateCount++;

		const uniqueId = light.uniqueId as number;
		const typeId = getVolumetricLightTypeId(light);
		const intensity = (light as { intensity: number }).intensity;

		if (typeId === 3 || !isNodeEnabled(light) || intensity <= 0 || config.volumeIntensity <= 0) {
			stats.perLight.set(uniqueId, {
				state: "disabled",
				slot: -1,
				reason: typeId === 3 ? "Hemispheric lights have no position nor direction and can't produce light shafts." : "The light is disabled or its intensity is zero.",
			});
			return;
		}

		let score = config.priority * 1e3;

		if (typeId === 1) {
			// A directional light lights the whole scene, it is always the most important contributor.
			score += 1e6;
		} else {
			const range = Math.min(getVolumetricLightRange(light, config, configuration), configuration.maxDistance);
			const radius = computeVolumetricLightBounds(light, range, temporaryPosition);

			if (!isSphereInFrustum(temporaryPosition, radius, frustumPlanes)) {
				stats.culledCount++;
				stats.perLight.set(uniqueId, {
					state: "culled",
					slot: -1,
					reason: "The light is outside of the frustum of the camera and doesn't reach it.",
				});
				return;
			}

			const distanceToCamera = Math.hypot(temporaryPosition[0] - cameraWorld[12], temporaryPosition[1] - cameraWorld[13], temporaryPosition[2] - cameraWorld[14]);
			const distance = Math.max(1, distanceToCamera - radius);

			score += config.volumeIntensity * intensity * Math.min(4, radius / distance);
		}

		candidates.push({
			light,
			config,
			isClustered,
			typeId,
			score,
		});
	});

	candidates.sort((a, b) => b.score - a.score);

	// A light that already owns a shadowed slot keeps it unless a challenger is clearly better. Without this
	// hysteresis, two lights with close scores would swap slots every frame and recompile the shader each time.
	const previousSlots = new Map<number, number>();
	previous?.shadowed.forEach((entry, index) => {
		previousSlots.set(entry.candidate.light.uniqueId as number, index);
	});

	const shadowedCandidates: { candidate: IVolumetricLightCandidate; shadow: IVolumetricShadowSlot }[] = [];
	const unshadowedCandidates: IVolumetricLightCandidate[] = [];

	// Explains why each light of the unshadowed tier doesn't use a shadow map, written as the lights are
	// classified so the shadow map of each light is only resolved once per selection.
	const unshadowedReasons = new Map<number, string>();

	let csm: IVolumetricLightSelection["csm"] = null;

	candidates.forEach((candidate) => {
		const { light, config } = candidate;
		const uniqueId = light.uniqueId as number;

		if (!config.castVolumetricShadows) {
			unshadowedReasons.set(uniqueId, "occlusion is disabled on this light.");
			unshadowedCandidates.push(candidate);
			return;
		}

		if (candidate.isClustered) {
			unshadowedReasons.set(uniqueId, "clustered lighting doesn't support shadow maps.");
			unshadowedCandidates.push(candidate);
			return;
		}

		if (_getSerializedLightData(light)?.shadowEnabled === false) {
			unshadowedReasons.set(uniqueId, "shadows are disabled on this light or on the scene.");
			unshadowedCandidates.push(candidate);
			return;
		}

		const generator = (light as LightBase).shadowGenerator;

		if (!generator) {
			unshadowedReasons.set(
				uniqueId,
				isPointLight(light) ? "the light has no shadow generator (Babylon Lite has no shadows for the point lights)." : "the light has no shadow generator."
			);
			unshadowedCandidates.push(candidate);
			return;
		}

		const internal = generator as { _shadowType?: string; _depthTexture?: GPUTexture; _csmCascadeCount?: number };

		if (internal._shadowType === "csm" && budget.allowCsm) {
			if (!csm && internal._depthTexture) {
				csm = {
					candidate,
					generator,
					cascades: internal._csmCascadeCount ?? 4,
					kind: VolumetricShadowKind.Sampler2DShadow,
					packed: false,
				};
				return;
			}

			unshadowedReasons.set(uniqueId, csm ? "another light already uses the single cascaded shadow map slot." : "its cascaded shadow map is not ready yet.");
			unshadowedCandidates.push(candidate);
			return;
		}

		const shadow = resolveVolumetricShadowSlot(light);
		if (!shadow) {
			unshadowedReasons.set(uniqueId, "the shadow map of the light is not ready yet.");
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
		if (previousSlots.get(entry.candidate.light.uniqueId as number) === undefined) {
			return score;
		}

		// Additive so it stays a bonus for the negative scores a negative priority produces.
		return score + Math.abs(score) * volumetricSlotHysteresis;
	}

	function getPreviousSlot(entry: { candidate: IVolumetricLightCandidate }): number {
		return previousSlots.get(entry.candidate.light.uniqueId as number) ?? Number.MAX_SAFE_INTEGER;
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
		unshadowedReasons.set(entry.candidate.light.uniqueId as number, "the shadowed lights budget is full.");
		unshadowedCandidates.push(entry.candidate);
	});

	unshadowedCandidates.sort((a, b) => b.score - a.score);

	// Directional lights light the whole view ray and are marched along it, the point and spot lights are
	// integrated over their own volume only. Both live in the same arrays, the directional ones first.
	const directional: IVolumetricLightCandidate[] = [];
	const local: IVolumetricLightCandidate[] = [];
	const dropped: { candidate: IVolumetricLightCandidate; reason: string }[] = [];

	unshadowedCandidates.forEach((candidate) => {
		if (candidate.typeId === 1) {
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
		stats.perLight.set(entry.candidate.light.uniqueId as number, {
			state: "shadowed",
			slot: index,
			reason: `Casting volumetric shadows using slot ${index + 1} of ${budget.maxShadowSlots}.`,
		});
	});

	if (csm) {
		const csmSelection = csm as NonNullable<IVolumetricLightSelection["csm"]>;

		stats.shadowedCount++;
		stats.perLight.set(csmSelection.candidate.light.uniqueId as number, {
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
		const reason = unshadowedReasons.get(candidate.light.uniqueId as number) ?? "the light has no shadow map.";

		stats.perLight.set(candidate.light.uniqueId as number, { state: "unshadowed", slot: -1, reason: `${occluded}: ${reason}` });
	});

	dropped.forEach(({ candidate, reason }) => {
		stats.droppedCount++;
		stats.perLight.set(candidate.light.uniqueId as number, { state: "dropped", slot: -1, reason });
	});

	return { shadowed, unshadowed, directionalCount: directional.length, csm, stats };
}

/**
 * Defines everything that ends up in a "#define" of the raymarching shader. Any change to this key
 * requires the shader to be recompiled, everything else is a simple uniform update.
 */
export interface IVolumetricShaderEnvironment {
	fogMode: number;
	transmittance: VolumetricTransmittanceMode;
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
export function isVolumetricLightSupported(light: VolumetricLight): boolean {
	return isClusteredLightNode(light) || isPointLight(light) || isSpotLight(light) || isDirectionalLight(light);
}

/**
 * Returns the shadow generator information kept by the tools for the given generator (serialized Babylon.js data).
 * @internal
 */
export function _getVolumetricShadowGeneratorData(generator: ShadowGenerator): any {
	return getShadowGeneratorInfo(generator)?.data ?? null;
}
