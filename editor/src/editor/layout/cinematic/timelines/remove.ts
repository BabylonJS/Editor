import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeyEvent, ICinematicSound, ICinematicTrack } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

export function removeAnimationKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, keyframe: ICinematicKey | ICinematicKeyCut) {
	const keyFrameAnimationsIndex = track.keyFrameAnimations?.indexOf(keyframe) ?? -1;
	const animationGroupWeightIndex = track.animationGroupWeight?.indexOf(keyframe) ?? -1;
	const soundVolumeIndex = track.soundVolume?.indexOf(keyframe) ?? -1;

	if (keyFrameAnimationsIndex === -1 && animationGroupWeightIndex === -1 && soundVolumeIndex === -1) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			if (keyFrameAnimationsIndex !== -1) {
				track.keyFrameAnimations!.splice(keyFrameAnimationsIndex, 0, keyframe);
			}

			if (animationGroupWeightIndex !== -1) {
				track.animationGroupWeight!.splice(animationGroupWeightIndex, 0, keyframe);
			}

			if (soundVolumeIndex !== -1) {
				track.soundVolume!.splice(soundVolumeIndex, 0, keyframe);
			}
		},
		redo: () => {
			if (keyFrameAnimationsIndex !== -1) {
				track.keyFrameAnimations!.splice(keyFrameAnimationsIndex, 1);
			}

			if (animationGroupWeightIndex !== -1) {
				track.animationGroupWeight!.splice(animationGroupWeightIndex, 1);
			}

			if (soundVolumeIndex !== -1) {
				track.soundVolume!.splice(soundVolumeIndex, 1);
			}
		},
	});

	cinematicEditor.forceUpdate();
}

export function removeSoundKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, soundKey: ICinematicSound) {
	const index = track.sounds!.indexOf(soundKey);
	if (index === -1) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => track.sounds!.splice(index, 0, soundKey),
		redo: () => track.sounds!.splice(index, 1),
	});

	cinematicEditor.forceUpdate();
}

export function removeEventKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, eventKey: ICinematicKeyEvent) {
	const index = track.keyFrameEvents!.indexOf(eventKey);
	if (index === -1) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => track.keyFrameEvents!.splice(index, 0, eventKey),
		redo: () => track.keyFrameEvents!.splice(index, 1),
	});

	cinematicEditor.forceUpdate();
}

export function removeAnimationGroupKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, animationGroup: ICinematicAnimationGroup) {
	const index = track.animationGroups!.indexOf(animationGroup);
	if (index === -1) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => track.animationGroups!.splice(index, 0, animationGroup),
		redo: () => track.animationGroups!.splice(index, 1),
	});

	cinematicEditor.forceUpdate();
}
