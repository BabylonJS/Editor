import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

import { NullEngine, Scene, Mesh, DirectionalLight, Vector3, FreeCamera, TransformNode, InstancedMesh, Skeleton } from "babylonjs";

vi.mock("babylonjs-editor-tools", () => ({}));

import { Editor } from "../../../src/editor/main";
import { cloneNode } from "../../../src/tools/node/clone";

describe("tools/node/clone", () => {
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

	describe("cloneNode", () => {
		test("should clone mesh", () => {
			const mesh = new Mesh("testMesh", scene);
			mesh.skeleton = new Skeleton("skeletonTest", "skeletonTest", scene);
			mesh.metadata = {
				hello: "world",
			};

			const instance = mesh.createInstance("testMeshInstance");
			const transformNode = new TransformNode("testTransformNode", scene);
			const light = new DirectionalLight("testLight", new Vector3(0, -1, 0), scene);
			const camera = new FreeCamera("testCamera", new Vector3(0, 5, -10), scene);

			const tree = new TransformNode("testTree", scene);
			const childTree = new TransformNode("testChildTree", scene);
			childTree.parent = tree;

			const notNode = {};

			const [meshClone, meshInstanceClone, transformNodeClone, lightClone, cameraClone, treeClone, notNodeClone] = [
				cloneNode(editor, mesh) as Mesh,
				cloneNode(editor, instance) as InstancedMesh,
				cloneNode(editor, transformNode) as TransformNode,
				cloneNode(editor, light) as DirectionalLight,
				cloneNode(editor, camera) as FreeCamera,
				cloneNode(editor, tree) as TransformNode,
				cloneNode(editor, notNode as any),
			];

			expect(notNodeClone).toBeNull();

			expect(meshClone).toBeDefined();
			expect(meshClone!.skeleton).toBeDefined();
			expect(meshClone!.skeleton).not.toBe(mesh.skeleton);
			expect(meshClone!.skeleton!.bones).toHaveLength(mesh.skeleton.bones.length);
			expect(meshClone.metadata).toBeDefined();
			expect(meshClone.metadata).not.toBe(mesh.metadata);
			expect(meshClone.metadata.hello).toBe("world");

			expect(meshInstanceClone).toBeDefined();
			expect(transformNodeClone).toBeDefined();
			expect(lightClone).toBeDefined();
			expect(cameraClone).toBeDefined();

			expect(treeClone.getDescendants()[0]).toBeDefined();
			expect(treeClone.name).toBe("testTree (Clone)");
			expect(treeClone.getDescendants()[0]).not.toBe(childTree);
			expect(treeClone.getDescendants()[0].name).toBe("testChildTree");
		});
	});
});
