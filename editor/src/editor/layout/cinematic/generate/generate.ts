import { Animation, AnimationGroup, IAnimationKey, Scene, Tools, Sound, AnimationEvent, AbstractMesh, Vector3 } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { isCamera } from "../../../../tools/guards/nodes";

import { getMotionBlurPostProcess } from "../../../rendering/motion-blur";
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

                    sound.stop();
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
            track.keyFrameEvents.forEach((configuration) => {
                maxFrame = Math.max(maxFrame, configuration.frame);

                eventsAnimation.addEvent(new AnimationEvent(configuration.frame, () => {
                    switch (configuration.data?.type) {
                        case "set-enabled":
                            if (configuration.data.node) {
                                configuration.data.node.setEnabled(configuration.data.value);
                            }
                            break;

                        case "apply-impulse":
                            const mesh = configuration.data.mesh as AbstractMesh;
                            const contactPoint = configuration.data!.contactPoint as Vector3;

                            let meshes = mesh
                                ? [mesh]
                                : scene.meshes.filter((m) => m.physicsAggregate);

                            if (configuration.data.radius) {
                                meshes = meshes.filter((m) => {
                                    const centerWorld = m.getBoundingInfo().boundingBox.centerWorld;
                                    return Vector3.Distance(centerWorld, contactPoint) <= configuration.data!.radius;
                                });
                            }

                            meshes.forEach((m) => {
                                if (m.physicsAggregate?.body) {
                                    m.refreshBoundingInfo({
                                        applyMorph: true,
                                        applySkeleton: true,
                                        updatePositionsArray: true,
                                    });

                                    const direction = contactPoint.subtract(m.getBoundingInfo().boundingBox.centerWorld);
                                    direction.multiplyInPlace(configuration.data!.force);

                                    m.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
                                    m.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
                                    m.physicsAggregate.body.applyImpulse(direction.negateInPlace(), contactPoint);
                                }
                            });
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

                if (isCamera(node) && track.propertyPath === "position") {
                    animation.addEvent(new AnimationEvent(animationKeyCut.key1.frame, () => {
                        const motionBlur = getMotionBlurPostProcess();
                        if (!motionBlur) {
                            return;
                        }

                        let motionStrength = motionBlur.motionStrength;
                        motionBlur.motionStrength = 0;

                        requestAnimationFrame(() => {
                            motionBlur.motionStrength = motionStrength;
                        });
                    }));
                }

            }
        });

        animation.setKeys(keys);

        result.addTargetedAnimation(animation, node);
    });

    result.normalize();

    return result;
}
