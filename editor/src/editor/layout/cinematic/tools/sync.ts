import { AnimationGroup, Sound } from "babylonjs";

import { ICinematic } from "babylonjs-editor-tools";

export interface ISyncAnimationGroupsToFrameOptions {
	pauseAfterSync: boolean;
}

export function syncAnimationGroupsToFrame(frame: number, cinematic: ICinematic, options: ISyncAnimationGroupsToFrameOptions) {
	cinematic.tracks.forEach((track) => {
		const animationGroup = track.animationGroup as AnimationGroup;
		if (!animationGroup) {
			return;
		}

		track.animationGroups?.forEach((configuration) => {
			const endFrame = configuration.frame + (configuration.endFrame - configuration.startFrame) / configuration.speed;
			if (configuration.frame > frame || endFrame < frame) {
				return;
			}

			const frameDiff = frame - configuration.frame;

			if (frameDiff > 0) {
				const offset = frameDiff * configuration.speed;

				animationGroup.play(false);
				animationGroup.goToFrame(offset);

				if (options.pauseAfterSync) {
					animationGroup.stop();
				}
			}
		});
	});
}

export function syncSoundsToFrame(frame: number, cinematic: ICinematic) {
	cinematic.tracks.forEach((track) => {
		const sound = track.sound as Sound;
		if (!sound) {
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
				sound.play(0, offset);
			}
		});
	});
}
