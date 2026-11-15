import { SceneContext } from "@babylonjs/lite";

import { getVLSPostProcess } from "../rendering/vls";
import { getDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { SoundNode } from "../tools/sound";
import { getAnimationTypeForObject } from "../tools/animation";
import { getAnimationGroupByName, getMeshById, getNodeById, getSceneData } from "../tools/scene";

import { EditorAnimation } from "../animation/animation";

import { getPropertyValue } from "./tools";
import { ICinematic, ICinematicKey, ICinematicKeyCut } from "./typings";

function toVec3(value: any): { x: number; y: number; z: number } {
	return { x: value?.[0] ?? 0, y: value?.[1] ?? 0, z: value?.[2] ?? 0 };
}

/**
 * Parses the given JSON data and returns a new cinematic object.
 * @param data defines the JSON data of the cinematic to parse.
 * @param scene defines the reference to the scene used to retrieve cinematic's data.
 */
export function parseCinematic(data: ICinematic, scene: SceneContext): ICinematic {
	return {
		name: data.name,
		framesPerSecond: data.framesPerSecond,
		outputFramesPerSecond: data.outputFramesPerSecond,
		tracks: data.tracks.map((track) => {
			let node: any = null;
			let animationType: number | null = null;

			if (track.node) {
				node = getNodeById(track.node, scene);
				if (!node) {
					node = getSceneData(scene).particleSystems.find((ps: any) => ps.id === track.node) ?? null;
				}
			} else if (track.defaultRenderingPipeline) {
				node = getDefaultRenderingPipeline();
			} else if (track.volumetricLightScattering) {
				node = getVLSPostProcess();
			}

			if (track.propertyPath) {
				const value = getPropertyValue(node, track.propertyPath);
				animationType = getAnimationTypeForObject(value);
			}

			let sound: SoundNode | null = null;
			if (track.sound) {
				sound = getNodeById(track.sound, scene) as SoundNode;
			}

			return {
				node,
				sound,
				propertyPath: track.propertyPath,
				defaultRenderingPipeline: track.defaultRenderingPipeline,
				volumetricLightScattering: track.volumetricLightScattering,
				animationGroupWeight: track.animationGroupWeight,
				animationGroup: track.animationGroup ? getAnimationGroupByName(track.animationGroup, scene) : null,
				animationGroups: track.animationGroups,

				sounds: track.sounds,
				soundVolume: parseKeyFrameAnimations(track.soundVolume ?? [], EditorAnimation.ANIMATIONTYPE_FLOAT),

				keyFrameEvents: track.keyFrameEvents?.map((event) => {
					const result = {
						...event,
					};

					switch (event.data?.type) {
						case "set-enabled":
							result.data = {
								type: "set-enabled",
								value: event.data.value,
								node: getNodeById(event.data.node, scene),
							};
							break;
						case "apply-impulse":
							result.data = {
								type: "apply-impulse",
								radius: event.data.radius,
								mesh: getMeshById(event.data.mesh, scene),
								force: toVec3(event.data.force),
								contactPoint: toVec3(event.data.contactPoint),
							};
							break;
					}

					return result;
				}),

				keyFrameAnimations: node && animationType !== null && parseKeyFrameAnimations(track.keyFrameAnimations ?? [], animationType),
			};
		}),
	} as ICinematic;
}

/**
 * Parses the given value and returns the reference to the right value to be animated. The values animated by the
 * tools are plain numbers (floats) or arrays of numbers (vectors, quaternions, colors, matrices).
 * @param value defines the raw value to parse (ie. number or array for vectors).
 * @param type defines the type of the property animated.
 * @example [0, 0, 0] with type EditorAnimation.ANIMATIONTYPE_VECTOR3 will return a new [0, 0, 0] array.
 */
export function parseCinematicKeyValue(value: any, type: number): any {
	if (value === null) {
		return null;
	}

	if (value === undefined) {
		return undefined;
	}

	switch (type) {
		case EditorAnimation.ANIMATIONTYPE_FLOAT:
			return value;
		case EditorAnimation.ANIMATIONTYPE_VECTOR2:
		case EditorAnimation.ANIMATIONTYPE_VECTOR3:
		case EditorAnimation.ANIMATIONTYPE_QUATERNION:
		case EditorAnimation.ANIMATIONTYPE_COLOR3:
		case EditorAnimation.ANIMATIONTYPE_COLOR4:
		case EditorAnimation.ANIMATIONTYPE_MATRIX:
			return Array.isArray(value) ? value.slice() : value;
	}
}

export function parseKeyFrameAnimations(keyFrameAnimations: (ICinematicKey | ICinematicKeyCut)[], animationType: number) {
	return keyFrameAnimations?.map((keyFrame) => {
		const animationKey = keyFrame.type === "key" ? (keyFrame as ICinematicKey) : null;
		if (animationKey) {
			return {
				...animationKey,
				value: parseCinematicKeyValue(animationKey.value, animationType),
				inTangent: parseCinematicKeyValue(animationKey.inTangent, animationType),
				outTangent: parseCinematicKeyValue(animationKey.outTangent, animationType),
			} as ICinematicKey;
		}

		const animationKeyCut = keyFrame.type === "cut" ? (keyFrame as ICinematicKeyCut) : null;
		if (animationKeyCut) {
			return {
				...animationKeyCut,
				key1: {
					...animationKeyCut.key1,
					value: parseCinematicKeyValue(animationKeyCut.key1.value, animationType),
					inTangent: parseCinematicKeyValue(animationKeyCut.key1.inTangent, animationType),
					outTangent: parseCinematicKeyValue(animationKeyCut.key1.outTangent, animationType),
				},
				key2: {
					...animationKeyCut.key2,
					value: parseCinematicKeyValue(animationKeyCut.key2.value, animationType),
					inTangent: parseCinematicKeyValue(animationKeyCut.key2.inTangent, animationType),
					outTangent: parseCinematicKeyValue(animationKeyCut.key2.outTangent, animationType),
				},
			} as ICinematicKeyCut;
		}

		throw new Error(`Unknown key frame type: ${keyFrame.type}`);
	});
}
