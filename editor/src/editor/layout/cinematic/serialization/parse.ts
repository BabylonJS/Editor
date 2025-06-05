import { Scene, Sound, Vector3 } from "babylonjs";
import {
    ICinematic, ICinematicKey, ICinematicKeyCut, ICinematicTrack, parseCinematicKeyValue,
} from "babylonjs-editor-tools";

import { getSoundById } from "../../../../tools/sound/tools";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

export function parseCinematic(data: ICinematic, scene: Scene) {
    const tracks = data.tracks.map((track) => {
        return parseCinematicTrack(track, scene);
    });

    return {
        name: data.name,
        framesPerSecond: data.framesPerSecond,
        tracks: tracks.filter((track) => track !== null),
        outputFramesPerSecond: data.outputFramesPerSecond,
    } as ICinematic;
}

export function parseCinematicTrack(track: ICinematicTrack, scene: Scene) {
    let node: any = null;
    let animationType: number | null = null;

    if (track.node) {
        node = scene.getNodeById(track.node);
    } else if (track.defaultRenderingPipeline) {
        node = getDefaultRenderingPipeline();
    }

    if (track.propertyPath) {
        if (!node) {
            return null;
        }

        const value = getInspectorPropertyValue(node, track.propertyPath);
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

        keyFrameEvents: track.keyFrameEvents?.map((event) => {
            const result = {
                ...event,
            };

            switch (event.data?.type) {
                case "set-enabled":
                    result.data = {
                        type: "set-enabled",
                        value: event.data.value,
                        node: scene.getNodeById(event.data.node),
                    };
                    break;

                case "apply-impulse":
                    result.data = {
                        type: "apply-impulse",
                        radius: event.data.radius,
                        mesh: scene.getMeshById(event.data.mesh),
                        force: Vector3.FromArray(event.data.force),
                        contactPoint: Vector3.FromArray(event.data.contactPoint),
                    };
                    break;

            }

            return result;
        }),

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
}
