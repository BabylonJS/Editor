import { ICinematicAnimationGroup, ICinematicTrack } from "babylonjs-editor-tools";

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

export function createAnimationGroupGhostRect(ag: ICinematicAnimationGroup, scale: number, height: number) {
	return (
		<rect
			key={`animation-group-${ag.frame}-ghost`}
			x={ag.frame}
			y={height * 0.5 - 8 / scale}
			width={ag.endFrame - ag.startFrame}
			height={16 / scale}
			rx={8 / scale}
			ry={8 / scale}
			opacity={0.35}
			stroke="black"
			strokeWidth={2}
		/>
	);
}
