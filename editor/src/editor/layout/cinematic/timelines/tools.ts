import { CinematicKeyType, ICinematicKey, ICinematicKeyCut, isCinematicKey, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

export function getKeyFrame(key: CinematicKeyType) {
	if (isCinematicKeyCut(key)) {
		return key.key1.frame;
	}

	return key.frame;
}

export function transformKeyAs(cinematicEditor: CinematicEditor, cinematicKey: ICinematicKey | ICinematicKeyCut) {
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
				delete (cinematicKey as any)[key];
			});

			Object.keys(oldKey).forEach((key) => {
				(cinematicKey as any)[key] = (oldKey as any)[key];
			});
		},
		redo: () => {
			Object.keys(cinematicKey).forEach((key) => {
				delete (cinematicKey as any)[key];
			});

			Object.keys(resultKey).forEach((key) => {
				(cinematicKey as any)[key] = (resultKey as any)[key];
			});
		},
	});

	cinematicEditor.forceUpdate();
}
