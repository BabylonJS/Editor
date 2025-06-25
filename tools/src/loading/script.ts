
import { Scene } from "@babylonjs/core/scene";

import { applyDecorators } from "../decorators/apply";

import { ScriptMap } from "./loader";

export function applyScriptForObject(scene: Scene, object: any, scriptsMap: ScriptMap, rootUrl: string): void {
	if (!object.metadata) {
		return;
	}

	object.metadata.scripts?.forEach((script) => {
		if (!script.enabled) {
			return;
		}

		const exports = scriptsMap[script.key];
		if (!exports) {
			return;
		}

		if (exports.default) {
			const instance = new exports.default(object);

			applyDecorators(scene, object, script, instance, rootUrl);

			if (instance.onStart) {
				scene.onBeforeRenderObservable.addOnce(() => instance.onStart!());
			}

			if (instance.onUpdate) {
				scene.onBeforeRenderObservable.add(() => instance.onUpdate!());
			}
		} else {
			if (exports.onStart) {
				scene.onBeforeRenderObservable.addOnce(() => exports.onStart!(object));
			}

			if (exports.onUpdate) {
				scene.onBeforeRenderObservable.add(() => exports.onUpdate!(object));
			}
		}
	});

	object.metadata.scripts = undefined;
}
