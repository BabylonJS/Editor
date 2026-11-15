import { describe, expect, test, vi } from "vitest";

import { createTransformNode } from "@babylonjs/lite";

import { createTestScene, stepTestScene } from "../helpers";
import { registerSceneNode } from "../../src/tools/scene";
import { disposeNode } from "../../src/tools/node";
import { applyScriptOnObject, getScriptByClassForObject } from "../../src/loading/script/apply";

describe("loading/script", () => {
	describe("applyScriptOnObject", () => {
		test("should call onStart once, onUpdate each frame and onStop when the object is disposed", () => {
			const { engine, scene } = createTestScene();

			const node = createTransformNode("node");
			registerSceneNode(scene, node, "transformNode");

			const ScriptClass = class {
				public onStart = vi.fn();
				public onUpdate = vi.fn();
				public onStop = vi.fn();
			};

			const instance = applyScriptOnObject(node, ScriptClass, scene);

			stepTestScene(engine, scene, 3);

			expect(instance.onStart).toHaveBeenCalledTimes(1);
			expect(instance.onUpdate).toHaveBeenCalledTimes(3);
			expect(getScriptByClassForObject(node, ScriptClass)).toBe(instance);

			disposeNode(scene, node);
			stepTestScene(engine, scene, 1);

			expect(instance.onStop).toHaveBeenCalledTimes(1);
			expect(instance.onUpdate).toHaveBeenCalledTimes(3);
		});
	});
});
