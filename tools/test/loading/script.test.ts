import { describe, expect, test, vi } from "vitest";

import { applyScriptOnObject } from "../../src/loading/script/apply";

describe("loading/script", () => {
	describe("applyScriptOnObject", () => {
		test("should onStart and onUpdate", async () => {
			const ScriptClass = class {
				onStart = vi.fn();
				onUpdate = vi.fn();
			};

			const scene: any = {
				onBeforeRenderObservable: {
					addOnce: vi.fn((fn) => fn()),
					add: vi.fn((fn) => fn()),
				},
			};

			const targertObject = {
				getScene() {
					return scene;
				},
			};

			const instance = applyScriptOnObject(targertObject, ScriptClass);

			expect(instance.onStart).toHaveBeenCalledTimes(1);
			expect(instance.onUpdate).toHaveBeenCalledTimes(1);
		});
	});
});
