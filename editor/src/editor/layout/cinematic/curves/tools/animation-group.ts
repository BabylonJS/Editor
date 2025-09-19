import { ICinematicTrack } from "babylonjs-editor-tools";

export function normalizeAnimationGroupWeightKeys(track: ICinematicTrack) {
	if (!track.animationGroups?.length) {
		return;
	}

	const maxFrame = Math.max(...track.animationGroups.map((s) => s.frame + s.endFrame));

	if ((track.animationGroupWeight?.length ?? 0) < 2) {
		track.animationGroupWeight = [
			{ type: "key", frame: 0, value: 1 },
			{ type: "key", frame: maxFrame, value: 1 },
		];
	}
}
