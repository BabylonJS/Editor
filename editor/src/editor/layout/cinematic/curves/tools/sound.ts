import { ICinematicTrack } from "babylonjs-editor-tools";

export function normalizeSoundVolumeKeys(track: ICinematicTrack) {
	if (!track.sounds?.length) {
		return;
	}

	const maxFrame = Math.max(...track.sounds.map((s) => s.frame + s.endFrame));

	if ((track.soundVolume?.length ?? 0) < 2) {
		track.soundVolume = [
			{ type: "key", frame: 0, value: 1 },
			{ type: "key", frame: maxFrame, value: 1 },
		];
	}
}
