import { AnimationGroup } from "babylonjs";

import { ICinematic, mergeCinematicSequences } from "babylonjs-editor-tools";
import { SoundNode } from "../../../nodes/sound";

export interface ISyncAnimationGroupsToFrameOptions {
	pauseAfterSync: boolean;
}

/**
 * Plays the animation groups of the cinematic where they are at the given frame of the cinematic.
 */
export function syncAnimationGroupsToFrame(frame: number, cinematic: ICinematic, options: ISyncAnimationGroupsToFrameOptions) {
	mergeCinematicSequences(cinematic).forEach((track) => {
		const animationGroup = track.animationGroup as AnimationGroup;
		if (!animationGroup) {
			return;
		}

		track.animationGroups?.forEach((configuration) => {
			animationGroup.speedRatio = configuration.speed;

			let framesCount = configuration.endFrame - configuration.startFrame;
			if (configuration.repeatCount) {
				framesCount += framesCount * configuration.repeatCount;
			}

			const endFrame = configuration.frame + framesCount / Math.abs(configuration.speed);
			if (configuration.frame > frame || endFrame < frame) {
				return;
			}

			const frameDiff = frame - configuration.frame;

			if (frameDiff > 0) {
				const offset = configuration.speed >= 0 ? frameDiff * Math.abs(configuration.speed) : (framesCount - frameDiff) * Math.abs(configuration.speed);

				animationGroup.play(false);
				animationGroup.goToFrame(offset);

				if (options.pauseAfterSync) {
					animationGroup.stop();
				}
			}
		});
	});
}

/**
 * Plays the sounds of the cinematic where they are at the given frame of the cinematic.
 */
export function syncSoundsToFrame(frame: number, cinematic: ICinematic) {
	mergeCinematicSequences(cinematic).forEach((track) => {
		const node = track.sound as SoundNode;
		if (!node) {
			return;
		}

		track.sounds?.forEach((configuration) => {
			const endFrame = configuration.frame + (configuration.endFrame - configuration.startFrame);
			if (configuration.frame > frame || endFrame < frame) {
				return;
			}

			const frameDiff = frame - configuration.frame;

			if (frameDiff > 0) {
				const offset = frameDiff / cinematic.framesPerSecond;
				node.play({
					startOffset: offset,
				});
			}
		});
	});
}
