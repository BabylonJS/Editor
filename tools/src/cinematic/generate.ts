import { Scene } from "@babylonjs/core/scene";
import { Sound } from "@babylonjs/core/Audio/sound";
import { Animation } from "@babylonjs/core/Animations/animation";
import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";
import { AnimationEvent } from "@babylonjs/core/Animations/animationEvent";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { isCamera } from "../tools/guards";
import { getAnimationTypeForObject } from "../tools/animation";

import { getMotionBlurPostProcess } from "../rendering/motion-blur";
import { getDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { handleApplyEvent } from "./events/event";
import { handleSetEnabledEvent } from "./events/set-enabled";
import { handleApplyImpulseEvent } from "./events/apply-impulse";

import { ICinematic } from "./typings";
import { Cinematic } from "./cinematic";
import { isCinematicKey, isCinematicKeyCut } from "./guards";
import { getPropertyValue, registerAfterAnimationCallback } from "./tools";

export type GenerateCinematicAnimationGroupOptions = {
	/**
	 * Defines wether or not sounds should be ignored when generating the animation group.
	 * This means that no sound will be played during the cinematic playback.
	 * @default false
	 */
	ignoreSounds?: boolean;
};

/**
 * Parses the given cinematic object and generates a new playable animation group.
 * @param cinematic defines the cinematic object to parse that was previously loaded.
 * @param scene defines the reference to the scene where to retrieve the animated objects.
 * @param options defines the options to use when generating the animation group.
 */
export function generateCinematicAnimationGroup(cinematic: ICinematic, scene: Scene, options?: GenerateCinematicAnimationGroupOptions) {
	const result = new Cinematic(cinematic.name, scene);

	cinematic.tracks.forEach((track) => {
		// Animation groups
		const animationGroup = track.animationGroup as AnimationGroup;
		if (animationGroup && track.animationGroups?.length) {
			const effectiveAnimationGroup = animationGroup.clone(`${animationGroup.name}-cinematic-temp`);

			const index = scene.animationGroups.indexOf(effectiveAnimationGroup);
			if (index !== -1) {
				scene.animationGroups.splice(index, 1);
			}

			result.onAnimationEndObservable.add(() => {
				animationGroup.stop();
				effectiveAnimationGroup.stop();
			});

			const minFrame = track.animationGroups.reduce((prev, curr) => Math.min(prev, curr.frame), Number.MAX_VALUE) ?? 0;
			const maxFrame = track.animationGroups.reduce((prev, curr) => Math.max(prev, curr.frame + curr.endFrame), 0) ?? 0;

			const dummyObject = {
				frame: minFrame,
			};

			const animationGroupsAnimation = new Animation(effectiveAnimationGroup.name, "frame", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);

			animationGroupsAnimation.setKeys([
				{ frame: minFrame, value: 0 },
				{ frame: maxFrame, value: maxFrame },
			]);

			track.animationGroups.forEach((configuration) => {
				animationGroupsAnimation.addEvent(
					new AnimationEvent(configuration.frame, () => {
						const repeatCount = configuration.repeatCount ?? 0;

						effectiveAnimationGroup.to = configuration.endFrame;
						effectiveAnimationGroup.speedRatio = configuration.speed;
						effectiveAnimationGroup.stop();
						effectiveAnimationGroup.play(repeatCount > 0);
						effectiveAnimationGroup.goToFrame(configuration.startFrame);

						if (repeatCount) {
							let currentRepeatCount = 0;
							effectiveAnimationGroup.onAnimationGroupLoopObservable.add(() => {
								++currentRepeatCount;

								if (currentRepeatCount > repeatCount) {
									effectiveAnimationGroup.stop();
								}
							});
						}
					})
				);
			});

			result.addTargetedAnimation(animationGroupsAnimation, dummyObject);

			if ((track.animationGroupWeight?.length ?? 0) >= 2) {
				const dummyObject = {
					weight: 0,
				};

				const weightAnimation = new Animation(
					`${effectiveAnimationGroup.name}-weights`,
					"weight",
					60,
					Animation.ANIMATIONTYPE_FLOAT,
					Animation.ANIMATIONLOOPMODE_CYCLE,
					false
				);
				const weightKeys: IAnimationKey[] = [];

				track.animationGroupWeight!.forEach((keyFrame) => {
					if (isCinematicKeyCut(keyFrame)) {
						weightKeys.push(keyFrame.key1);
						weightKeys.push(keyFrame.key2);
					} else {
						weightKeys.push(keyFrame);
					}
				});

				weightAnimation.setKeys(weightKeys);
				result.addTargetedAnimation(weightAnimation, dummyObject);

				registerAfterAnimationCallback(result, scene, () => {
					effectiveAnimationGroup.weight = dummyObject.weight;
				});
			}
		}

		const sound = track.sound as Sound;
		const soundBuffer = sound?.getAudioBuffer();

		if (!options?.ignoreSounds && sound && soundBuffer && track.sounds?.length) {
			const dummyObject = {
				dummy: 0,
				volume: 0,
			};

			const soundAnimation = new Animation(sound.name, "dummy", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);

			let maxFrame = 0;
			track.sounds?.forEach((configuration) => {
				const duration = configuration.endFrame - configuration.startFrame;

				maxFrame = Math.max(maxFrame, configuration.frame + duration);

				soundAnimation.addEvent(
					new AnimationEvent(
						configuration.frame,
						(currentFrame) => {
							const frameDiff = currentFrame - configuration.frame;
							const offset = (frameDiff + configuration.startFrame) / cinematic.framesPerSecond;

							// sound.stop();
							sound.play(0, offset);
						},
						false
					)
				);

				soundAnimation.addEvent(
					new AnimationEvent(configuration.frame + duration, () => {
						sound.stop();
					})
				);
			});

			soundAnimation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: maxFrame, value: maxFrame },
			]);

			result.addTargetedAnimation(soundAnimation, dummyObject);

			if ((track.soundVolume?.length ?? 0) >= 2) {
				const volumeAnimation = new Animation(sound.name, "volume", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);
				const volumeKeys: IAnimationKey[] = [];

				track.soundVolume!.forEach((keyFrame) => {
					if (isCinematicKeyCut(keyFrame)) {
						volumeKeys.push(keyFrame.key1);
						volumeKeys.push(keyFrame.key2);
					} else {
						volumeKeys.push(keyFrame);
					}
				});

				volumeAnimation.setKeys(volumeKeys);
				result.addTargetedAnimation(volumeAnimation, dummyObject);

				registerAfterAnimationCallback(result, scene, () => {
					sound.setVolume(dummyObject.volume);
				});
			}
		}

		if (track.keyFrameEvents) {
			const dummyObject = {
				dummy: 0,
			};

			const eventsAnimation = new Animation("events", "dummy", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE, false);

			let maxFrame = 0;
			track.keyFrameEvents?.forEach((configuration) => {
				maxFrame = Math.max(maxFrame, configuration.frame);

				eventsAnimation.addEvent(
					new AnimationEvent(configuration.frame, () => {
						switch (configuration.data?.type) {
							case "event":
								handleApplyEvent(result, configuration.data);
								break;
							case "set-enabled":
								handleSetEnabledEvent(configuration.data);
								break;
							case "apply-impulse":
								handleApplyImpulseEvent(scene, configuration.data);
								break;
						}
					})
				);
			});

			eventsAnimation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: maxFrame + 1, value: maxFrame + 1 },
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
			if (isCinematicKey(keyFrame)) {
				return keys.push(keyFrame);
			}

			if (isCinematicKeyCut(keyFrame)) {
				keys.push(keyFrame.key1);
				keys.push(keyFrame.key2);

				if (isCamera(node) && track.propertyPath === "position") {
					animation.addEvent(
						new AnimationEvent(keyFrame.key1.frame, () => {
							const motionBlur = getMotionBlurPostProcess();
							if (!motionBlur) {
								return;
							}

							let motionStrength = motionBlur.motionStrength;
							motionBlur.motionStrength = 0;

							requestAnimationFrame(() => {
								motionBlur.motionStrength = motionStrength;
							});
						})
					);
				}
			}
		});

		animation.setKeys(keys);

		result.addTargetedAnimation(animation, node);
	});

	result.normalize();

	return result;
}
