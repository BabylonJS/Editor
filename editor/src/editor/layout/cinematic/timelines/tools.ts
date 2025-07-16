import { CinematicKeyType, ICinematicKey, ICinematicKeyCut, isCinematicKey, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

import { ICinematicTrackerKey } from "./tracker";

export function getKeyFrame(key: CinematicKeyType | ICinematicTrackerKey) {
	if (isCinematicKeyCut(key)) {
		return key.key1.frame;
	}

	return key.frame;
}

export function transformKeyAs(
	cinematicEditor: CinematicEditor,
	cinematicKey: ICinematicKey | ICinematicKeyCut,
) {
	const cloneKey = { ...cinematicKey } as ICinematicKey;
	const cloneKeyCut = { ...cinematicKey } as ICinematicKeyCut;

	const oldKey = { ...cinematicKey } as ICinematicKey | ICinematicKeyCut;
	const resultKey = {} as ICinematicKey | ICinematicKeyCut;

	switch (oldKey.type) {
		case "cut":
			resultKey.type = "key";
			if (isCinematicKey(resultKey)) {
				resultKey.frame = cloneKeyCut.key1.frame;
				resultKey.value = cloneKeyCut.key1.value?.clone?.() ?? cloneKeyCut.key1.value;
				resultKey.inTangent = cloneKeyCut.key1.inTangent?.clone?.() ?? cloneKeyCut.key1.inTangent;
				resultKey.outTangent = cloneKeyCut.key1.outTangent?.clone?.() ?? cloneKeyCut.key1.outTangent;
			}
			break;

		case "key":
			resultKey.type = "cut";
			if (isCinematicKeyCut(resultKey)) {
				resultKey.key1 = {
					frame: cloneKey.frame,
					value: cloneKey.value?.clone?.() ?? cloneKey.value,
					inTangent: cloneKey.inTangent?.clone?.() ?? cloneKey.inTangent,
					outTangent: cloneKey.outTangent?.clone?.() ?? cloneKey.outTangent,
				};
				resultKey.key2 = {
					frame: cloneKey.frame,
					value: cloneKey.value?.clone?.() ?? cloneKey.value,
					inTangent: cloneKey.inTangent?.clone?.() ?? cloneKey.inTangent,
					outTangent: cloneKey.outTangent?.clone?.() ?? cloneKey.outTangent,
				};
			}
			break;
	}

	registerUndoRedo({
		executeRedo: true,
		undo: () => {
			Object.keys(cinematicKey).forEach((key) => {
				delete cinematicKey[key];
			});

			Object.keys(oldKey).forEach((key) => {
				cinematicKey[key] = oldKey[key];
			});
		},
		redo: () => {
			Object.keys(cinematicKey).forEach((key) => {
				delete cinematicKey[key];
			});

			Object.keys(resultKey).forEach((key) => {
				cinematicKey[key] = resultKey[key];
			});
		},
	});

	cinematicEditor.forceUpdate();
}
