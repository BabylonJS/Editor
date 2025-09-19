import { Scene } from "@babylonjs/core/scene";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Animation } from "@babylonjs/core/Animations/animation";
import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";

import { Cinematic } from "./cinematic";

export function cloneKey(dataType: number, key: IAnimationKey): IAnimationKey {
	let value: any;
	switch (dataType) {
		case Animation.ANIMATIONTYPE_FLOAT:
			value = key.value;
			break;
		default:
			value = key.value.clone();
			break;
	}

	return {
		value,
		frame: key.frame,
		interpolation: key.interpolation,
		inTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.inTangent : key.inTangent?.clone(),
		outTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.outTangent : key.outTangent?.clone(),
	};
}

/**
 * Returns the current value of the given property of the given object.
 * @param object defines the root object where to parse the property and return its value.
 * @param property defines the path of the property to get its value.
 * @example getPropertyValue(scene, "ambientColor");
 * @example getPropertyValue(scene, "ambientColor.r");
 */
export function getPropertyValue(object: any, property: string) {
	const parts = property.split(".");

	let value = object;

	for (let i = 0; i < parts.length; ++i) {
		value = value[parts[i]];
	}

	return value;
}

export function registerAfterAnimationCallback(cinematic: Cinematic, scene: Scene, callback: () => void) {
	let sceneRenderObserver: Observer<Scene> | null = null;

	cinematic.onAnimationGroupPlayObservable.add(() => {
		sceneRenderObserver = scene.onAfterAnimationsObservable.add(() => {
			callback();
		});
	});

	cinematic.onAnimationGroupPauseObservable.add(() => {
		if (sceneRenderObserver) {
			scene.onAfterAnimationsObservable.remove(sceneRenderObserver);
			sceneRenderObserver = null;
		}
	});

	cinematic.onAnimationGroupEndObservable.add(() => {
		if (sceneRenderObserver) {
			scene.onAfterAnimationsObservable.remove(sceneRenderObserver);
			sceneRenderObserver = null;
		}
	});
}
