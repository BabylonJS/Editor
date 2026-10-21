import { SceneContext } from "@babylonjs/lite";

import { IScript } from "../../script";

import { applyDecorators, IApplyDecoratorsOptions } from "../../decorators/apply";

import { Observer } from "../../tools/observable";
import { getOnDisposeObservable } from "../../tools/node";
import { getNodeScene, getSceneData } from "../../tools/scene";
import { IKeyboardInfo, IPointerInfo } from "../../tools/inputs";
import { isAnyParticleSystem, isNode, isScene, isSoundNode, isSprite } from "../../tools/guards";

import { ScriptMap } from "../loader";

export interface _IApplyScriptsForObjectOptions extends IApplyDecoratorsOptions {}

/**
 * @internal
 */
export function _applyScriptsForObject(scene: SceneContext, object: any, scriptsMap: ScriptMap, options: _IApplyScriptsForObjectOptions) {
	if (!object.metadata?.scripts) {
		return;
	}

	const sceneData = getSceneData(scene);

	object.metadata.scripts?.forEach((script) => {
		if (!script.enabled) {
			return;
		}

		const exports = scriptsMap[script.key];
		if (!exports) {
			return;
		}

		let result = exports;

		const observers: IRegisteredScriptObservers = {};

		if (exports.default) {
			result = new exports.default(object);

			const decoratorsResult = applyDecorators(scene, object, script, result, options);
			Object.assign(observers, decoratorsResult?.observers ?? {});
		}

		if (result.onStart) {
			observers.onStartObserver = sceneData.onBeforeRenderObservable.addOnce(() => result.onStart!(object));
		}

		if (result.onUpdate) {
			observers.onUpdateObserver = sceneData.onBeforeRenderObservable.add(() => result.onUpdate!(object));
		}

		_registerScriptInstance(object, result, script.key, observers);
	});

	object.metadata.scripts = undefined;
}

/**
 * Applies the given script constructor on the given object on the fly.
 * @param object defines the reference to the object on which the script must be applied.
 * @param scriptConstructor defines the constructor of the script to apply on the object.
 * @param scene defines the reference to the scene. If not provided, will try to get it from the object (node registered in the tools).
 * @example
 * import { applyScriptOnObject } from "babylonjs-editor-tools-lite";
 * ...
 * const instance = applyScriptOnObject(mesh, MyScriptClass, scene);
 */
export function applyScriptOnObject(object: any, scriptConstructor: new (...args: any) => any, scene?: SceneContext) {
	scene ??= getNodeScene(object) ?? (isScene(object) ? object : undefined);
	if (!scene) {
		throw new Error("Cannot apply script on object: no scene available.");
	}

	const sceneData = getSceneData(scene);

	const instance = new scriptConstructor(object);
	const observers: IRegisteredScriptObservers = {};

	const script = {
		values: {},
	};

	applyDecorators(scene, object, script, instance, {
		rootUrl: "",
	});

	if (instance.onStart) {
		observers.onStartObserver = sceneData.onBeforeRenderObservable.addOnce(() => instance.onStart!());
	}

	// The observer is kept so the updates stop when the object is disposed.
	if (instance.onUpdate) {
		observers.onUpdateObserver = sceneData.onBeforeRenderObservable.add(() => instance.onUpdate!());
	}

	_registerScriptInstance(object, instance, "runtime", observers);

	return instance;
}

export interface IRegisteredScript {
	/**
	 * Defines the key of the script. Refer to scriptMap.
	 */
	key: string;
	/**
	 * Defines the instance of the script that was created while loading the scene.
	 */
	instance: IScript;
	/**
	 * Defines the dictionary of all registered observers for this script.
	 */
	observers: IRegisteredScriptObservers;
}

export interface IRegisteredScriptObservers {
	onStartObserver?: Observer<SceneContext> | null;
	onUpdateObserver?: Observer<SceneContext> | null;
	pointerObserver?: Observer<IPointerInfo> | null;
	keyboardObserver?: Observer<IKeyboardInfo> | null;
}

export const scriptsDictionary = new Map<any, IRegisteredScript[]>();

/**
 * When a scene is being loaded, scripts that were attached to objects in the scene using the Editor are processed.
 * This function registers the instance of scripts per object in order to retrieve them later.
 * @internal
 */
export function _registerScriptInstance(object: any, scriptInstance: IScript, key: string, observers: IRegisteredScriptObservers) {
	const registeredScript = {
		key,
		observers,
		instance: scriptInstance,
	} as IRegisteredScript;

	if (!scriptsDictionary.has(object)) {
		scriptsDictionary.set(object, [registeredScript]);
	} else {
		scriptsDictionary.get(object)!.push(registeredScript);
	}

	const onDispose = () => {
		const scripts = scriptsDictionary.get(object)?.slice();
		scripts?.forEach((s) => {
			_removeRegisteredScriptInstance(object, s);
		});

		scriptsDictionary.delete(object);
	};

	if (isScene(object)) {
		getSceneData(object).onDisposeObservable.addOnce(onDispose);
	} else if (isNode(object) || isAnyParticleSystem(object) || isSoundNode(object) || isSprite(object) || object.metadata) {
		getOnDisposeObservable(object).addOnce(onDispose);
	}
}

/**
 * When a node is disposed, or for hot reload purpose, the script should be unregistered and all observers removed.
 * @internal
 */
export function _removeRegisteredScriptInstance(object: any, registeredScript: IRegisteredScript) {
	registeredScript.observers.onStartObserver?.remove();
	registeredScript.observers.onUpdateObserver?.remove();

	registeredScript.observers.pointerObserver?.remove();
	registeredScript.observers.keyboardObserver?.remove();

	try {
		registeredScript.instance.onStop?.(object);
	} catch (e) {
		console.error(`Failed to call onStop for script ${registeredScript.key} on object ${object}`, e);
	}

	const runningScripts = scriptsDictionary.get(object);
	const index = runningScripts?.indexOf(registeredScript) ?? -1;
	if (index !== -1) {
		runningScripts?.splice(index, 1);
	}
}

/**
 * Returns all the instances of the script attached to the given object that matches the given class type.
 * The same script can be attached multiple times to the same object. If you ensure that ONLY DISTINCT scripts
 * are attached to the object, you can use `getScriptByClassForObject` which will return the unique instance for the given object.
 * @param object defines the reference to the object where the script to retrieve is attached to.
 * @param classType defines the class of the type to retrieve
 * @example
 * import { IScript, getAllScriptsByClassForObject } from "babylonjs-editor-tools-lite";
 *
 * class ScriptClass implements IScript {
 * 	public onStart(): void {
 * 		const instances = getAllScriptsByClassForObject(mesh, OtherScriptClass);
 * 		instances.forEach((i) => {
 * 			i.doSomething();
 * 		});
 * 	}
 * }
 *
 * class OtherScriptClass implements IScript {
 * 	public doSomething(): void {
 * 		console.log("Doing something!");
 * 	}
 * }
 */
export function getAllScriptsByClassForObject<T extends new (...args: any) => any>(object: any, classType: T) {
	const data = scriptsDictionary.get(object);
	const result = data?.filter((s) => s.instance.constructor === classType);

	return (result?.map((r) => r.instance) as InstanceType<T>[]) ?? null;
}

/**
 * Returns the instance of the script attached to the given object that matches the given class type.
 * @param object defines the reference to the object where the script to retrieve is attached to.
 * @param classType defines the class of the type to retrieve
 * @example
 * import { IScript, getScriptByClassForObject } from "babylonjs-editor-tools-lite";
 *
 * class ScriptClass implements IScript {
 * 	public onStart(): void {
 * 		const instance = getScriptByClassForObject(mesh, OtherScriptClass);
 * 		instance.doSomething();
 * 	}
 * }
 *
 * class OtherScriptClass implements IScript {
 * 	public doSomething(): void {
 * 		console.log("Doing something!");
 * 	}
 * }
 */
export function getScriptByClassForObject<T extends new (...args: any) => any>(object: any, classType: T) {
	const result = getAllScriptsByClassForObject<T>(object, classType);
	return (result?.[0] as InstanceType<T>) ?? null;
}
