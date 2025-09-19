import { Sound, AnimationGroup } from "babylonjs";
import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeyEvent, ICinematicSound, ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { showAlert } from "../../../../ui/dialog";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { CinematicEditor } from "../editor";

export function addAnimationKey(
	cinematicEditor: CinematicEditor,
	type: "key" | "cut",
	track: ICinematicTrack,
	positionX: number | null,
	keyFrameAnimations?: (ICinematicKey | ICinematicKeyCut)[]
) {
	keyFrameAnimations ??= track.keyFrameAnimations!;

	const node = track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : track.node;

	if (positionX === null || !node || !track.propertyPath) {
		return;
	}

	const frame = Math.round(positionX / cinematicEditor.state.scale);
	const value = getInspectorPropertyValue(node, track.propertyPath);

	const existingKey = keyFrameAnimations.find((k) => {
		if (isCinematicKeyCut(k)) {
			return k.key1.frame === frame;
		}

		return k.frame === frame;
	});

	if (existingKey) {
		return;
	}

	const key =
		type === "key"
			? ({
					frame,
					type: "key",
					value: value.clone?.() ?? value,
				} as ICinematicKey)
			: ({
					type: "cut",
					key1: {
						frame,
						value: value.clone?.() ?? value,
					},
					key2: {
						frame,
						value: value.clone?.() ?? value,
					},
				} as ICinematicKeyCut);

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			const index = keyFrameAnimations.indexOf(key);
			if (index !== -1) {
				keyFrameAnimations.splice(index, 1);
			}
		},
		redo: () => keyFrameAnimations.push(key),
		action: () => cinematicEditor.timelines.sortAnimationsKeys(),
	});

	cinematicEditor.timelines.setState({
		rightClickPositionX: null,
	});

	cinematicEditor.forceUpdate();
}

export function addSoundKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, positionX?: number | null) {
	positionX ??= cinematicEditor.timelines.state.rightClickPositionX;

	if (positionX === null || !track.sound) {
		return;
	}

	const frame = Math.round(positionX / cinematicEditor.state.scale);
	const existingKey = track.sounds!.find((k) => k.frame === frame);

	if (existingKey) {
		return;
	}

	const sound = track.sound as Sound;
	const buffer = sound.getAudioBuffer();

	if (!buffer) {
		return showAlert(
			"Can't add sound track",
			"The sound track is not ready yet, please wait until the sound is loaded. If this problem persists, please verify the sound file is correctly loaded."
		);
	}

	const duration = buffer.duration;
	const fps = cinematicEditor.cinematic.framesPerSecond;

	const key = {
		frame,
		type: "sound",
		speed: 1,
		startFrame: 0,
		endFrame: duration * fps,
	} as ICinematicSound;

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			const index = track.sounds!.indexOf(key);
			if (index !== -1) {
				track.sounds!.splice(index, 1);
			}
		},
		redo: () => track.sounds!.push(key),
		action: () => cinematicEditor.timelines.sortAnimationsKeys(),
	});

	cinematicEditor.timelines.setState({
		rightClickPositionX: null,
	});
	cinematicEditor.forceUpdate();
}

export function addEventKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, positionX?: number | null) {
	positionX ??= cinematicEditor.timelines.state.rightClickPositionX;

	if (positionX === null) {
		return;
	}

	const frame = Math.round(positionX / cinematicEditor.state.scale);

	const existingKey = track.keyFrameEvents!.find((k) => {
		return k.frame === frame;
	});

	if (existingKey) {
		return;
	}

	const key = {
		frame,
		type: "event",
	} as ICinematicKeyEvent;

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			const index = track.keyFrameEvents!.indexOf(key);
			if (index !== -1) {
				track.keyFrameEvents!.splice(index, 1);
			}
		},
		redo: () => track.keyFrameEvents!.push(key),
		action: () => cinematicEditor.timelines.sortAnimationsKeys(),
	});

	cinematicEditor.timelines.setState({
		rightClickPositionX: null,
	});
	cinematicEditor.forceUpdate();
}

export function addAnimationGroupKey(cinematicEditor: CinematicEditor, track: ICinematicTrack, positionX?: number | null) {
	positionX ??= cinematicEditor.timelines.state.rightClickPositionX;

	if (positionX === null || !track.animationGroup) {
		return;
	}

	const frame = Math.round(positionX / cinematicEditor.state.scale);
	const existingKey = track.animationGroups!.find((k) => k.frame === frame);

	if (existingKey) {
		return;
	}

	const animationGroup = track.animationGroup as AnimationGroup;

	const key = {
		frame,
		type: "group",
		speed: 1,
		startFrame: animationGroup.from,
		endFrame: animationGroup.to,
	} as ICinematicAnimationGroup;

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			const index = track.animationGroups!.indexOf(key);
			if (index !== -1) {
				track.animationGroups!.splice(index, 1);
			}
		},
		redo: () => track.animationGroups!.push(key),
		action: () => cinematicEditor.timelines.sortAnimationsKeys(),
	});

	cinematicEditor.timelines.setState({
		rightClickPositionX: null,
	});
	cinematicEditor.forceUpdate();
}
