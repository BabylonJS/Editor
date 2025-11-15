jest.mock("@babylonjs/core/Materials/material", () => ({
	Material: class {},
}));
jest.mock("@babylonjs/core/Maths/math.color", () => ({
	Color3: class {},
	Color4: class {},
}));
jest.mock("@babylonjs/core/Maths/math.vector", () => ({
	Vector2: class {},
	Vector3: class {},
}));
jest.mock("@babylonjs/core/Materials/Textures/texture", () => ({
	Texture: class {},
}));
jest.mock("@babylonjs/core/Particles/Node/nodeParticleSystemSet", () => ({
	NodeParticleSystemSet: class {},
}));
jest.mock("@babylonjs/gui/2D/advancedDynamicTexture", () => ({
	AdvancedDynamicTexture: class {},
}));
jest.mock("@babylonjs/core/Loading/sceneLoaderFlags", () => ({
	SceneLoaderFlags: {
		ForceFullSceneLoadingForIncremental: 1,
	},
}));
jest.mock("@babylonjs/core/Loading/sceneLoader", () => ({
	LoadAssetContainerAsync: jest.fn(),
}));

import { applyScriptOnObject } from "../../src/loading/script";

describe("loading/script", () => {
	describe("applyScriptOnObject", () => {
		test("should onStart and onUpdate", async () => {
			const ScriptClass = class {
				onStart = jest.fn();
				onUpdate = jest.fn();
			};

			const scene: any = {
				onBeforeRenderObservable: {
					addOnce: jest.fn((fn) => fn()),
					add: jest.fn((fn) => fn()),
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
