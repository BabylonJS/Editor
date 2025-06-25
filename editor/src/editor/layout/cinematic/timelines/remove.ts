import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeyEvent, ICinematicSound, ICinematicTrack } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

export function removeAnimationKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, keyframe: ICinematicKey | ICinematicKeyCut) {
	const index = track.keyFrameAnimations!.indexOf(keyframe);
	if (index === -1) {
		return;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => track.keyFrameAnimations!.splice(index, 0, keyframe),
		redo: () => track.keyFrameAnimations!.splice(index, 1),
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
