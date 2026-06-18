import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

import { NullEngine, Scene, Mesh, DirectionalLight, Vector3, ShadowGenerator } from "babylonjs";

import { Editor } from "../../../src/editor/main";

import { isInstancedMesh } from "../../../src/tools/guards/nodes";
import { createMeshInstance } from "../../../src/tools/mesh/instance";
import { CollisionMesh } from "../../../src/editor/nodes/collision";

describe("tools/mesh/instance", () => {
	let engine: NullEngine;
	let scene: Scene;
	let editor: Editor;

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);

		editor = {
			layout: {
				preview: {
					scene,
				},
			},
		} as any;
	});

	afterEach(() => {
		scene.dispose();
		engine.dispose();
	});

	describe("createMeshInstance", () => {
		test("should create an instance", () => {
			const mesh = new Mesh("testMesh", scene);
			mesh.position.set(1, 2, 3);
			mesh.rotation.set(1, 2, 3);
			mesh.scaling.set(1, 2, 3);
			mesh.isVisible = false;
			mesh.setEnabled(false);

			const light = new DirectionalLight("testLight", new Vector3(0, -1, 0), scene);
			const shadowGenerator = new ShadowGenerator(1024, light);
			shadowGenerator.addShadowCaster(mesh);

			const collisionMesh = new CollisionMesh("testCollisionMesh", scene);
			collisionMesh.parent = mesh;
			collisionMesh.updateInstances = vi.fn();

			const instance = createMeshInstance(editor, mesh);

			expect(isInstancedMesh(instance)).toBe(true);

			expect(instance.position.asArray()).toEqual([1, 2, 3]);
			expect(instance.rotation.asArray()).toEqual([1, 2, 3]);
			expect(instance.scaling.asArray()).toEqual([1, 2, 3]);

			expect(instance.isVisible).toBe(false);
			expect(instance.isEnabled()).toBe(false);

			expect(shadowGenerator.getShadowMap()?.renderList).toContain(instance);
			expect(collisionMesh.updateInstances).toHaveBeenCalled();
		});
	});
});
