import { SceneContext } from "@babylonjs/lite";

import { Observer } from "../tools/observable";
import { getSceneData } from "../tools/scene";

import { EditorAnimation, IEditorAnimationKey } from "../animation/animation";
import { getAnimatedPropertyValue } from "../animation/property";

import { Cinematic } from "./cinematic";

function cloneValue(value: any): any {
	return Array.isArray(value) ? value.slice() : value;
}

export function cloneKey(dataType: number, key: IEditorAnimationKey): IEditorAnimationKey {
	const isFloat = dataType === EditorAnimation.ANIMATIONTYPE_FLOAT;

	return {
		value: isFloat ? key.value : cloneValue(key.value),
		frame: key.frame,
		interpolation: key.interpolation,
		inTangent: isFloat ? key.inTangent : cloneValue(key.inTangent),
		outTangent: isFloat ? key.outTangent : cloneValue(key.outTangent),
	};
}

/**
 * Returns the current value of the given property of the given object. The Babylon.js property names of the editor
 * are supported (ie. "minZ" for the near plane of a camera, "rotation" for the Euler rotation of a node).
 * @param object defines the root object where to parse the property and return its value.
 * @param property defines the path of the property to get its value.
 * @example getPropertyValue(camera, "fov");
 * @example getPropertyValue(node, "position.x");
 */
export function getPropertyValue(object: any, property: string) {
	return getAnimatedPropertyValue(object, property);
}

export function registerAfterAnimationCallback(cinematic: Cinematic, scene: SceneContext, callback: () => void) {
	let sceneRenderObserver: Observer<SceneContext> | null = null;

	cinematic.onAnimationGroupPlayObservable.add(() => {
		sceneRenderObserver?.remove();
		sceneRenderObserver = getSceneData(scene).onAfterAnimationsObservable.add(() => {
			callback();
		});
	});

	cinematic.onAnimationGroupPauseObservable.add(() => {
		if (sceneRenderObserver) {
			sceneRenderObserver.remove();
			sceneRenderObserver = null;
		}
	});

	cinematic.onAnimationGroupEndObservable.add(() => {
		if (sceneRenderObserver) {
			sceneRenderObserver.remove();
			sceneRenderObserver = null;
		}
	});
}
