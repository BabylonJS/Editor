import { describe, beforeEach, test, expect, vi } from "vitest";

import { Node, NullEngine, Scene, TransformNode } from "@babylonjs/core";

import { applyDecorators } from "../../../src/decorators/apply";
import { animationGroupFromScene, nodeFromDescendants, nodeFromScene } from "../../../src/decorators/scene";

describe("decorators/apply", () => {
	let engine: NullEngine;
	let scene: Scene;
	let transformNode: TransformNode;

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);
		transformNode = new TransformNode("MyNode", scene);
	});

	test("should get nodes from scene", () => {
		vi.spyOn(scene, "getNodeByName");

		class Temp extends Node {
			@nodeFromScene("MyNode")
			public node: TransformNode;
		}

		const instance = new Temp("Temp", scene);
		applyDecorators(scene, transformNode, {}, instance, "");
		expect(scene.getNodeByName).toHaveBeenCalledWith("MyNode");
		expect(instance.node).toBe(transformNode);
	});

	test("should get nodes from descendants", () => {
		const descendant = new TransformNode("Descendant", scene);
		descendant.parent = transformNode;

		vi.spyOn(transformNode, "getDescendants");

		class Temp extends Node {
			@nodeFromDescendants("Descendant", true)
			public node1: TransformNode;

			@nodeFromDescendants("Descendant", false)
			public node2: TransformNode;

			@nodeFromDescendants("Descendant")
			public node3: TransformNode;
		}

		const instance = new Temp("Temp", scene);

		applyDecorators(scene, transformNode, {}, instance, "");
		expect(transformNode.getDescendants).toHaveBeenNthCalledWith(1, true, expect.anything());
		expect(transformNode.getDescendants).toHaveBeenNthCalledWith(2, false, expect.anything());
		expect(transformNode.getDescendants).toHaveBeenNthCalledWith(3, false, expect.anything());
		expect(instance.node1).toBe(descendant);
		expect(instance.node2).toBe(descendant);
		expect(instance.node3).toBe(descendant);
	});

	test("should get animation group from scene", () => {
		const animationGroup = scene.getAnimationGroupByName("MyAnimationGroup");

		vi.spyOn(scene, "getAnimationGroupByName");

		class Temp extends Node {
			@animationGroupFromScene("MyAnimationGroup")
			public animationGroup = animationGroup;
		}

		const instance = new Temp("Temp", scene);
		applyDecorators(scene, transformNode, {}, instance, "");
		expect(scene.getAnimationGroupByName).toHaveBeenCalledWith("MyAnimationGroup");
		expect(instance.animationGroup).toBe(animationGroup);
	});
});
