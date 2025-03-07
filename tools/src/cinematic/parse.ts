import { Scene } from "@babylonjs/core/scene";
import { Sound } from "@babylonjs/core/Audio/sound";
import { Animation } from "@babylonjs/core/Animations/animation";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector2, Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";

import { getDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { getSoundById } from "../tools/sound";

import { getAnimationTypeForObject, getPropertyValue } from "./tools";
import { ICinematic, ICinematicKey, ICinematicKeyCut } from "./typings";

/**
 * Parses the given JSON data and returns a new cinematic object.
 * @param data defines the JSON data of the cinematic to parse.
 * @param scene defines the reference to the scene used to retrieve cinematic's data.
 */
export function parseCinematic(data: ICinematic, scene: Scene): ICinematic {
    return {
        name: data.name,
        framesPerSecond: data.framesPerSecond,
        outputFramesPerSecond: data.outputFramesPerSecond,
        tracks: data.tracks.map((track) => {
            let node: any = null;
            let animationType: number | null = null;

            if (track.node) {
                node = scene.getNodeById(track.node);
            } else if (track.defaultRenderingPipeline) {
                node = getDefaultRenderingPipeline();
            }

            if (track.propertyPath) {
                const value = getPropertyValue(node, track.propertyPath);
                animationType = getAnimationTypeForObject(value);
            }

            let sound: Sound | null = null;
            if (track.sound) {
                sound = getSoundById(track.sound, scene);
            }

            return {
                node,
                sound,
                propertyPath: track.propertyPath,
                defaultRenderingPipeline: track.defaultRenderingPipeline,
                animationGroup: track.animationGroup ? scene.getAnimationGroupByName(track.animationGroup) : null,
                animationGroups: track.animationGroups,
                sounds: track.sounds,
                keyFrameEvents: track.keyFrameEvents,
                keyFrameAnimations: node && animationType !== null && track.keyFrameAnimations?.map((keyFrame) => {
                    const animationKey = keyFrame.type === "key" ? keyFrame as ICinematicKey : null;
                    if (animationKey) {
                        return {
                            ...animationKey,
                            value: parseCinematicKeyValue(animationKey.value, animationType),
                            inTangent: parseCinematicKeyValue(animationKey.inTangent, animationType),
                            outTangent: parseCinematicKeyValue(animationKey.outTangent, animationType),
                        } as ICinematicKey;
                    }

                    const animationKeyCut = keyFrame.type === "cut" ? keyFrame as ICinematicKeyCut : null;
                    if (animationKeyCut) {
                        return {
                            ...animationKeyCut,
                            key1: {
                                ...animationKeyCut.key1,
                                value: parseCinematicKeyValue(animationKeyCut.key1.value, animationType),
                                inTangent: parseCinematicKeyValue(animationKeyCut.key1.inTangent, animationType),
                                outTangent: parseCinematicKeyValue(animationKeyCut.key1.outTangent, animationType),
                            } as ICinematicKey,
                            key2: {
                                ...animationKeyCut.key2,
                                value: parseCinematicKeyValue(animationKeyCut.key2.value, animationType),
                                inTangent: parseCinematicKeyValue(animationKeyCut.key2.inTangent, animationType),
                                outTangent: parseCinematicKeyValue(animationKeyCut.key2.outTangent, animationType),
                            },
                        } as ICinematicKeyCut;
                    }
                }),
            };
        }),
    } as ICinematic;
}

/**
 * Parses the given value and returns the reference to the right value to be animated.
 * @param value defines the raw value to parse (ie. number or array for vectors).
 * @param type defines the type of the property animated.
 * @example [0, 0, 0] with type Animation.ANIMATIONTYPE_VECTOR3 will return a new Vector3(0, 0, 0) object.
 */
export function parseCinematicKeyValue(value: any, type: number): any {
    if (value === null) {
        return null;
    }

    if (value === undefined) {
        return undefined;
    }

    switch (type) {
        case Animation.ANIMATIONTYPE_FLOAT: return value;
        case Animation.ANIMATIONTYPE_VECTOR2: return Vector2.FromArray(value);
        case Animation.ANIMATIONTYPE_VECTOR3: return Vector3.FromArray(value);
        case Animation.ANIMATIONTYPE_QUATERNION: return Quaternion.FromArray(value);
        case Animation.ANIMATIONTYPE_COLOR3: return Color3.FromArray(value);
        case Animation.ANIMATIONTYPE_COLOR4: return Color4.FromArray(value);
        case Animation.ANIMATIONTYPE_MATRIX: return Matrix.FromArray(value);
    }
}
