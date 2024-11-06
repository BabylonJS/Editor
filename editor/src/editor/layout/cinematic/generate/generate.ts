import { Animation, AnimationGroup, IAnimationKey, Scene, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { ICinematic, ICinematicKey, ICinematicKeyCut } from "../schema/typings";

import { cloneKey } from "./clone";

export function generateCinematicAnimationGroup(cinematic: ICinematic, scene: Scene): AnimationGroup {
    const result = new AnimationGroup(cinematic.name, scene);

    cinematic.tracks.forEach((track) => {
        // Animation groups
        const animationGroup = track.animationGroup as AnimationGroup;
        if (animationGroup) {
            track.animationGroups?.forEach((configuration) => {
                animationGroup.targetedAnimations.forEach((targetedAnimation) => {
                    let animation: Animation | null = null;

                    defer: {
                        const existingTargetedAnimations = result.targetedAnimations.filter((ta2) => ta2.target === targetedAnimation.target);
                        if (existingTargetedAnimations.length) {
                            const existingTargetedAnimationsPair = existingTargetedAnimations.find((et) => et.animation.targetProperty === targetedAnimation.animation.targetProperty);
                            if (existingTargetedAnimationsPair) {
                                animation = existingTargetedAnimationsPair.animation;
                                break defer;
                            }
                        }

                        animation = targetedAnimation.animation.clone();
                        animation.setKeys([]);
                        animation.name = Tools.RandomId();
                        animation.uniqueId = UniqueNumber.Get();
                        animation.framePerSecond = cinematic.framesPerSecond;
                    }

                    const keys = animation.getKeys();
                    const sourceKeys = targetedAnimation.animation.getKeys();

                    const normalizedFps = (cinematic.framesPerSecond / targetedAnimation.animation.framePerSecond);

                    sourceKeys.forEach((k) => {
                        if (k.frame >= configuration.startFrame && k.frame <= configuration.endFrame) {
                            keys.push({
                                ...cloneKey(targetedAnimation.animation.dataType, k),
                                frame: configuration.frame + k.frame * normalizedFps,
                            });
                        }
                    });

                    animation.setKeys(keys);

                    result.addTargetedAnimation(animation, targetedAnimation.target);
                });
            });
        }

        const node = track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : track.node;

        if (!node || !track.propertyPath || !track.keyFrameAnimations) {
            return;
        }

        const value = getInspectorPropertyValue(node, track.propertyPath);
        const animationType = getAnimationTypeForObject(value);

        if (animationType === null) {
            return;
        }

        const animation = new Animation(track.propertyPath, track.propertyPath, 60, animationType, Animation.ANIMATIONLOOPMODE_CYCLE, false);
        const keys: IAnimationKey[] = [];

        track.keyFrameAnimations?.forEach((keyFrame) => {
            const animationKey = keyFrame.type === "key" ? keyFrame as ICinematicKey : null;
            if (animationKey) {
                return keys.push(animationKey);
            }

            const animationKeyCut = keyFrame.type === "cut" ? keyFrame as ICinematicKeyCut : null;
            if (animationKeyCut) {
                keys.push(animationKeyCut.key1);
                keys.push(animationKeyCut.key2);
            }
        });

        animation.setKeys(keys);

        result.addTargetedAnimation(animation, node);
    });

    result.normalize();

    return result;
}
