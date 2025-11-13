import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Observer } from "@babylonjs/core/Misc/observable";
import { PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { KeyboardInfo } from "@babylonjs/core/Events/keyboardEvents";
import { IParticleSystem } from "@babylonjs/core/Particles/IParticleSystem";

import { IScript } from "../script";

import { applyDecorators } from "../decorators/apply";

import { isAnyParticleSystem, isNode, isScene } from "../tools/guards";

import { ScriptMap } from "./loader";

/**
 * Defines the cache of all
 */
export const scriptAssetsCache = new Map<string, any>();

/**
 * @internal
 */
export async function _preloadScriptsAssets(scene: Scene, rootUrl: string) {
	const nodes = [scene, ...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];

	const scripts = nodes
		.filter((node) => node.metadata?.scripts?.length)
		.map((node) => node.metadata.scripts)
		.flat();

	scripts.forEach((script) => {
		if (!script.values) {
			return;
		}

		for (const key in script.values) {
			if (!script.values.hasOwnProperty(key)) {
				continue;
			}

			const obj = script.values[key];
			if (obj.type === "asset" && obj.value) {
				scriptAssetsCache.set(obj.value, null);
			}
		}
	});

	const promises: Promise<void>[] = [];

	scriptAssetsCache.forEach((_, key) => {
		if (scriptAssetsCache.get(key)) {
			return;
		}

		promises.push(
			new Promise<void>(async (resolve) => {
				try {
					const response = await fetch(`${rootUrl}${key}`);
					const data = await response.json();

					scriptAssetsCache.set(key, data);
				} catch (e) {
					console.error(e);
				}

				resolve();
			})
		);
	});

	await Promise.all(promises);
}

/**
 * @internal
 */
export function _applyScriptsForObject(scene: Scene, object: any, scriptsMap: ScriptMap, rootUrl: string) {
	if (!object.metadata?.scripts) {
		return;
	}

	object.metadata.scripts?.forEach(async (script) => {
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

			const decoratorsResult = applyDecorators(scene, object, script, result, rootUrl);
			Object.assign(observers, decoratorsResult?.observers ?? {});
		}

		if (result.onStart) {
			observers.onStartObserver = scene.onBeforeRenderObservable.addOnce(() => result.onStart!(object));
		}

		if (result.onUpdate) {
			observers.onUpdateObserver = scene.onBeforeRenderObservable.add(() => result.onUpdate!(object));
		}

		_registerScriptInstance(object, result, script.key, observers);
	});

	object.metadata.scripts = undefined;
}

/**
 * Applies the given script constructor on the given object on the fly.
 * @param object defines the reference to the object on which the script must be applied.
 * @param scriptConstructor defines the constructor of the script to apply on the object.
 * @param scene defines the reference to the scene. If not provided, will try to get it from object.getScene()
 * @example
 * import { applyScriptOnObject } from "babylonjs-editor-tools";
 * ...
 * const instance = applyScriptOnObject(mesh, MyScriptClass);
 */
export function applyScriptOnObject(object: any, scriptConstructor: new (...args: any) => any, scene?: Scene) {
	scene ??= object.getScene?.();
	if (!scene) {
		throw new Error("Cannot apply script on object: no scene available.");
	}

	const instance = new scriptConstructor(object);
	const observers: IRegisteredScriptObservers = {};

	const script = {
		values: {},
	};

	applyDecorators(scene, object, script, instance, "");

	if (instance.onStart) {
		observers.onStartObserver = scene.onBeforeRenderObservable.addOnce(() => instance.onStart!());
	}

	if (instance.onUpdate) {
		scene.onBeforeRenderObservable.add(() => instance.onUpdate!());
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
	onStartObserver?: Observer<Scene> | null;
	onUpdateObserver?: Observer<Scene> | null;
	pointerObserver?: Observer<PointerInfo> | null;
	keyboardObserver?: Observer<KeyboardInfo> | null;
}

export const scriptsDictionary = new Map<Node | IParticleSystem | Scene, IRegisteredScript[]>();

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

	if (isNode(object) || isAnyParticleSystem(object) || isScene(object)) {
		object.onDisposeObservable.addOnce((() => {
			scriptsDictionary.get(object)?.forEach((s) => {
				_removeRegisteredScriptInstance(object, s);
			});

			scriptsDictionary.delete(object);
		}) as any);
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
 * import { IScript, getAllScriptsByClassForObject } from "babylonjs-editor-tools";
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
 * import { IScript, getScriptByClassForObject } from "babylonjs-editor-tools";
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
