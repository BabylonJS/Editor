import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Sound } from "@babylonjs/core/Audio/sound";
import { Animation } from "@babylonjs/core/Animations/animation";
import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";
import { AnimationEvent } from "@babylonjs/core/Animations/animationEvent";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { getDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { handleSetEnabledEvent } from "./events/set-enabled";
import { handleApplyImpulseEvent } from "./events/apply-impulse";

import { ICinematic, ICinematicKey, ICinematicKeyCut } from "./typings";
import { cloneKey, getAnimationTypeForObject, getPropertyValue } from "./tools";

/**
 * Parses the given cinematic object and generates a new playable animation group.
 * @param cinematic defines the cinematic object to parse that was previously loaded.
 * @param scene defines the reference to the scene where to retrieve the animated objects.
 */
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
                        animation.framePerSecond = cinematic.framesPerSecond;
                    }

                    const keys = animation.getKeys();
                    const sourceKeys = targetedAnimation.animation.getKeys();

                    const speed = configuration.speed;
                    const normalizedFps = (cinematic.framesPerSecond / targetedAnimation.animation.framePerSecond) / speed;

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

        const sound = track.sound as Sound;
        const soundBuffer = sound?.getAudioBuffer();

        if (sound && soundBuffer && track.sounds?.length) {
            const dummyObject = {
                dummy: 0,
            };

            const soundAnimation = new Animation(sound.name, "dummy", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);

            let maxFrame = 0;
            track.sounds?.forEach((configuration) => {
                const duration = configuration.endFrame - configuration.startFrame;

                maxFrame = Math.max(maxFrame, configuration.frame + duration);

                soundAnimation.addEvent(new AnimationEvent(configuration.frame, (currentFrame) => {
                    const frameDiff = currentFrame - configuration.frame;
                    const offset = (frameDiff + configuration.startFrame) / cinematic.framesPerSecond;

                    // sound.stop();
                    sound.play(0, offset);
                }, false));

                soundAnimation.addEvent(new AnimationEvent(configuration.frame + duration, () => {
                    sound.stop();
                }));
            });

            soundAnimation.setKeys([
                { frame: 0, value: 0 },
                { frame: maxFrame, value: maxFrame },
            ]);

            result.addTargetedAnimation(soundAnimation, dummyObject);
        }

        if (track.keyFrameEvents) {
            const dummyObject = {
                dummy: 0,
            };

            const eventsAnimation = new Animation("events", "dummy", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);

            let maxFrame = 0;
            track.keyFrameEvents?.forEach((configuration) => {
                maxFrame = Math.max(maxFrame, configuration.frame);

                eventsAnimation.addEvent(new AnimationEvent(configuration.frame, () => {
                    switch (configuration.data?.type) {
                        case "set-enabled":
                            handleSetEnabledEvent(scene, configuration.data);
                            break;
                        case "apply-impulse":
                            handleApplyImpulseEvent(scene, configuration.data);
                            break;
                    }
                }));
            });

            eventsAnimation.setKeys([
                { frame: 0, value: 0 },
                { frame: maxFrame, value: maxFrame },
            ]);

            result.addTargetedAnimation(eventsAnimation, dummyObject);
        }

        const node = track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : track.node;

        if (!node || !track.propertyPath || !track.keyFrameAnimations) {
            return;
        }

        const value = getPropertyValue(node, track.propertyPath);
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
