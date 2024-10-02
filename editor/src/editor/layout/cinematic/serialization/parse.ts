import { Animation, Color3, Color4, Matrix, Node, Quaternion, Scene, Vector2, Vector3 } from "babylonjs";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { ICinematic, ICinematicKey, ICinematicKeyCut } from "../typings";

/**
 * Parses the given JSON data and returns a new cinematic object.
 * @param data defines the JSON data of the cinematic to parse.
 * @param scene defines the reference to the scene used to retrieve cinematic's data.
 */
export function parseCinematic(data: ICinematic, scene: Scene): ICinematic {
    return {
        name: data.name,
        framesPerSecond: data.framesPerSecond,
        tracks: data.tracks.map((track) => {
            let node: Node | null = null;
            let animationType: number | null = null;

            if (track.nodeId) {
                node = scene.getNodeById(track.nodeId);
            }

            if (track.propertyPath) {
                const value = getInspectorPropertyValue(node, track.propertyPath);
                animationType = getAnimationTypeForObject(value);
            }

            return {
                nodeId: track.nodeId,
                propertyPath: track.propertyPath,
                animationGroups: track.animationGroups,
                keyFrameAnimations: node && animationType !== null && track.keyFrameAnimations?.map((keyFrame) => {
                    const animationKey = keyFrame.type === "key" ? keyFrame as ICinematicKey : null;
                    if (animationKey) {
                        return {
                            ...animationKey,
                            value: parseCinematicKeyValue(animationKey.value, animationType),
                        } as ICinematicKey;
                    }

                    const animationKeyCut = keyFrame.type === "cut" ? keyFrame as ICinematicKeyCut : null;
                    if (animationKeyCut) {
                        return {
                            ...animationKeyCut,
                            key1: {
                                ...animationKeyCut.key1,
                                value: parseCinematicKeyValue(animationKeyCut.key1.value, animationType),
                            } as ICinematicKey,
                            key2: {
                                ...animationKeyCut.key2,
                                value: parseCinematicKeyValue(animationKeyCut.key2.value, animationType),
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
