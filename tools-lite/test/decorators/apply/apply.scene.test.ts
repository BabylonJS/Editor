import { describe, beforeEach, test, expect } from "vitest";

import { createTransformNode, EngineContext, SceneContext, SceneNode } from "@babylonjs/lite";

import { createTestScene } from "../../helpers";
import { registerSceneNode } from "../../../src/tools/scene";
import { applyDecorators } from "../../../src/decorators/apply";
import { EditorAnimationGroup } from "../../../src/animation/animation-group";
import { animationGroupFromScene, nodeFromDescendants, nodeFromScene } from "../../../src/decorators/scene";

describe("decorators/apply", () => {
	let engine: EngineContext;
	let scene: SceneContext;
	let transformNode: SceneNode;

	beforeEach(() => {
		({ engine, scene } = createTestScene());
		void engine;

		transformNode = createTransformNode("MyNode");
		registerSceneNode(scene, transformNode, "transformNode");
	});

	test("should get nodes from scene", () => {
		class Temp {
			@nodeFromScene("MyNode")
			public node!: SceneNode;
		}

		const instance = new Temp();
		applyDecorators(scene, transformNode, {}, instance, {
			rootUrl: "",
		});

		expect(instance.node).toBe(transformNode);
	});

	test("should get nodes from descendants", () => {
		const child = createTransformNode("Child");
		child.parent = transformNode;
		transformNode.children.push(child);

		const descendant = createTransformNode("Descendant");
		descendant.parent = child;
		child.children.push(descendant);

		class Temp {
			@nodeFromDescendants("Descendant", true)
			public node1!: SceneNode;

			@nodeFromDescendants("Descendant", false)
			public node2!: SceneNode;

			@nodeFromDescendants("Child", true)
			public node3!: SceneNode;
		}

		const instance = new Temp();
		applyDecorators(scene, transformNode, {}, instance, {
			rootUrl: "",
		});

		expect(instance.node1).toBeNull();
		expect(instance.node2).toBe(descendant);
		expect(instance.node3).toBe(child);
	});

	test("should get animation group from scene", () => {
		const animationGroup = new EditorAnimationGroup("MyAnimationGroup", scene);

		class Temp {
			@animationGroupFromScene("MyAnimationGroup")
			public animationGroup!: EditorAnimationGroup;
		}

		const instance = new Temp();
		applyDecorators(scene, transformNode, {}, instance, {
			rootUrl: "",
		});

		expect(instance.animationGroup).toBe(animationGroup);
	});
});
