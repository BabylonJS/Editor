import { IAnimationKey } from "babylonjs";

import { isColor3, isColor4, isVector2, isVector3 } from "../../../../../tools/guards/math";

export interface ICinematicEditorEditableProperty {
	rootObject: any;
	property: string;
}

export function getEditableProperties(key: IAnimationKey, property: string): ICinematicEditorEditableProperty[] {
	if ((key[property] ?? null) === null) {
		return [];
	}

	if (typeof key.value === "number") {
		return [{ rootObject: key, property }];
	}

	if (isVector2(key.value)) {
		return [
			{ rootObject: key[property], property: "x" },
			{ rootObject: key[property], property: "y" },
		];
	}

	if (isVector3(key.value)) {
		return [
			{ rootObject: key[property], property: "x" },
			{ rootObject: key[property], property: "y" },
			{ rootObject: key[property], property: "z" },
		];
	}

	if (isColor3(key.value)) {
		return [
			{ rootObject: key[property], property: "r" },
			{ rootObject: key[property], property: "g" },
			{ rootObject: key[property], property: "b" },
		];
	}

	if (isColor4(key.value)) {
		return [
			{ rootObject: key[property], property: "r" },
			{ rootObject: key[property], property: "g" },
			{ rootObject: key[property], property: "b" },
			{ rootObject: key[property], property: "a" },
		];
	}

	return [];
}

export function getEditablePropertyValue(editableProperty: ICinematicEditorEditableProperty): number {
	return editableProperty.property ? editableProperty.rootObject[editableProperty.property] : (editableProperty.rootObject as number);
}

export function setEditablePropertyValue(editableProperty: ICinematicEditorEditableProperty, newValue: number): void {
	editableProperty.rootObject[editableProperty.property] = newValue;
}
