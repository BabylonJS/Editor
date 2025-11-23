import { describe, beforeEach, test, expect } from "vitest";

import { ISceneDecoratorData } from "../../src/decorators/apply";
import { nodeFromScene, nodeFromDescendants, animationGroupFromScene } from "../../src/decorators/scene";

describe("decorators/scene", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@nodeFromScene", () => {
		test("should add configuration to the target", () => {
			const fn = nodeFromScene("test");
			fn(target, "testProperty");

			expect(target.constructor._NodesFromScene).toBeDefined();
			expect(target.constructor._NodesFromScene!.length).toBe(1);
			expect(target.constructor._NodesFromScene![0].nodeName).toBe("test");
			expect(target.constructor._NodesFromScene![0].propertyKey).toBe("testProperty");
		});
	});

	describe("@nodeFromDescendants", () => {
		test("should add configuration to the target", () => {
			const fn = nodeFromDescendants("test");
			fn(target, "testProperty");

			expect(target.constructor._NodesFromDescendants).toBeDefined();
			expect(target.constructor._NodesFromDescendants!.length).toBe(1);
			expect(target.constructor._NodesFromDescendants![0].nodeName).toBe("test");
			expect(target.constructor._NodesFromDescendants![0].propertyKey).toBe("testProperty");
		});
	});

	describe("@fromAnimationGroups", () => {
		test("should add configuration to the target", () => {
			const fn = animationGroupFromScene("test");
			fn(target, "testProperty");

			expect(target.constructor._AnimationGroups).toBeDefined();
			expect(target.constructor._AnimationGroups!.length).toBe(1);
			expect(target.constructor._AnimationGroups![0].animationGroupName).toBe("test");
			expect(target.constructor._AnimationGroups![0].propertyKey).toBe("testProperty");
		});
	});
});
