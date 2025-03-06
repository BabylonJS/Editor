import { Animation, Color3, Color4, Matrix, Quaternion, Vector2, Vector3 } from "babylonjs";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { isCinematicKey } from "../schema/guards";
import { ICinematic, ICinematicKey, ICinematicKeyCut } from "../schema/typings";

export function serializeCinematic(cinematic: ICinematic): ICinematic {
    return {
        name: cinematic.name,
        framesPerSecond: cinematic.framesPerSecond,
        outputFramesPerSecond: cinematic.outputFramesPerSecond,
        tracks: cinematic.tracks.map((track) => {
            let animationType: number | null = null;

            const node = track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : track.node;

            if (node && track.propertyPath) {
                const value = getInspectorPropertyValue(node, track.propertyPath);
                animationType = getAnimationTypeForObject(value);
            }

            return {
                node: track.node?.id,
                propertyPath: track.propertyPath,

                animationGroups: track.animationGroups,
                animationGroup: track.animationGroup?.name,

                defaultRenderingPipeline: track.defaultRenderingPipeline,

                sound: track.sound?.id,
                sounds: track.sounds,

                keyFrameEvents: track.keyFrameEvents?.map((key) => ({
                    type: "event",
                    frame: key.frame,
                    data: key.data?.serialize(),
                })),

                keyFrameAnimations: animationType === null ? undefined : track.keyFrameAnimations?.map((keyFrame) => {
                    if (isCinematicKey(keyFrame)) {
                        return {
                            type: "key",
                            frame: keyFrame.frame,
                            value: serializeCinematicKeyValue(keyFrame.value, animationType),
                            inTangent: serializeCinematicKeyValue(keyFrame.inTangent, animationType),
                            outTangent: serializeCinematicKeyValue(keyFrame.outTangent, animationType),
                        } as ICinematicKey;
                    }

                    return {
                        type: "cut",
                        key1: {
                            frame: keyFrame.key1.frame,
                            value: serializeCinematicKeyValue(keyFrame.key1.value, animationType),
                            inTangent: serializeCinematicKeyValue(keyFrame.key1.inTangent, animationType),
                            outTangent: serializeCinematicKeyValue(keyFrame.key1.outTangent, animationType),
                        },
                        key2: {
                            frame: keyFrame.key2.frame,
                            value: serializeCinematicKeyValue(keyFrame.key2.value, animationType),
                            inTangent: serializeCinematicKeyValue(keyFrame.key2.inTangent, animationType),
                            outTangent: serializeCinematicKeyValue(keyFrame.key2.outTangent, animationType),
                        }
                    } as ICinematicKeyCut;
                }),
            };
        }),
    };
}

export function serializeCinematicKeyValue(value: any, type: number): any {
    if (value === null) {
        return null;
    }

    if (value === undefined) {
        return undefined;
    }

    switch (type) {
        case Animation.ANIMATIONTYPE_FLOAT: return value;
        case Animation.ANIMATIONTYPE_VECTOR2: return (value as Vector2).asArray();
        case Animation.ANIMATIONTYPE_VECTOR3: return (value as Vector3).asArray();
        case Animation.ANIMATIONTYPE_QUATERNION: return (value as Quaternion).asArray();
        case Animation.ANIMATIONTYPE_COLOR3: return (value as Color3).asArray();
        case Animation.ANIMATIONTYPE_COLOR4: return (value as Color4).asArray();
        case Animation.ANIMATIONTYPE_MATRIX: return (value as Matrix).asArray();
    }
}
