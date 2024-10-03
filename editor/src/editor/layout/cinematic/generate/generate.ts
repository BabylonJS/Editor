import { Animation, AnimationGroup, IAnimationKey, Scene } from "babylonjs";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { ICinematic, ICinematicKey, ICinematicKeyCut } from "../schema/typings";

export function generateCinematicAnimationGroup(cinematic: ICinematic, scene: Scene): AnimationGroup {
    const result = new AnimationGroup(cinematic.name, scene);

    cinematic.tracks.forEach((track) => {
        // Animation groups
        track.animationGroups?.forEach((configuration) => {
            const animationGroup = scene.getAnimationGroupByName(configuration.name);
            if (!animationGroup) {
                return;
            }

            animationGroup.targetedAnimations.forEach((targetedAnimation) => {
                const animation = targetedAnimation.animation.clone();
                const normalizedFps = cinematic.framesPerSecond / targetedAnimation.animation.framePerSecond;

                animation.getKeys().forEach((key) => {
                    key.frame += configuration.frame * normalizedFps;
                });

                result.addTargetedAnimation(animation, targetedAnimation.target);
            });
        });

        // Key frames
        if (!track.node || !track.propertyPath || !track.keyFrameAnimations) {
            return;
        }

        const value = getInspectorPropertyValue(track.node, track.propertyPath);
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

        result.addTargetedAnimation(animation, track.node);
    });

    return result;
}
