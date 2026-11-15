import { describe, expect, test, vi } from "vitest";

import { createTestScene, stepTestScene } from "../helpers";
import { EditorAnimationGroup } from "../../src/animation/animation-group";
import { EditorAnimationEvent } from "../../src/animation/animation-event";
import { _evaluateAnimationAt, EditorAnimation } from "../../src/animation/animation";

describe("animation/animation", () => {
	describe("_evaluateAnimationAt", () => {
		test("should interpolate linearly the floats and vectors", () => {
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 10, value: 10 },
			]);

			expect(_evaluateAnimationAt(animation, -5)).toBe(0);
			expect(_evaluateAnimationAt(animation, 5)).toBe(5);
			expect(_evaluateAnimationAt(animation, 20)).toBe(10);

			const vectorAnimation = new EditorAnimation("v", "position", 60, EditorAnimation.ANIMATIONTYPE_VECTOR3);
			vectorAnimation.setKeys([
				{ frame: 0, value: [0, 0, 0] },
				{ frame: 10, value: [10, 20, 30] },
			]);

			expect(_evaluateAnimationAt(vectorAnimation, 5)).toEqual([5, 10, 15]);
		});

		test("should use the step interpolation", () => {
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0, interpolation: EditorAnimation.KEY_INTERPOLATION_STEP },
				{ frame: 10, value: 10 },
			]);

			expect(_evaluateAnimationAt(animation, 9.9)).toBe(0);
			expect(_evaluateAnimationAt(animation, 10)).toBe(10);
		});

		test("should use the Hermite interpolation when the keys have tangents (same as Babylon.js)", () => {
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0, outTangent: 0 },
				{ frame: 10, value: 10, inTangent: 0 },
			]);

			// Hermite with zero tangents: smoothstep.
			expect(_evaluateAnimationAt(animation, 5)).toBeCloseTo(5, 5);
			expect(_evaluateAnimationAt(animation, 2.5)).toBeCloseTo(10 * (3 * 0.25 * 0.25 - 2 * 0.25 * 0.25 * 0.25), 5);
		});

		test("should interpolate the quaternions spherically", () => {
			const animation = new EditorAnimation("q", "rotationQuaternion", 60, EditorAnimation.ANIMATIONTYPE_QUATERNION);
			const s = Math.sin(Math.PI / 4);
			animation.setKeys([
				{ frame: 0, value: [0, 0, 0, 1] },
				{ frame: 10, value: [0, s, 0, s] },
			]);

			const value = _evaluateAnimationAt(animation, 5) as number[];
			expect(value[1]).toBeCloseTo(Math.sin(Math.PI / 8), 5);
			expect(value[3]).toBeCloseTo(Math.cos(Math.PI / 8), 5);
		});

		test("should apply the easing function", () => {
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.easingFunction = (gradient) => gradient * gradient;
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 10, value: 10 },
			]);

			expect(_evaluateAnimationAt(animation, 5)).toBeCloseTo(2.5, 5);
		});
	});

	describe("EditorAnimationGroup", () => {
		test("should play the animations, raise the events and notify the end", () => {
			const { engine, scene } = createTestScene();

			const target = { value: 0 };
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 60, value: 60 },
			]);

			const onEvent = vi.fn();
			animation.addEvent(new EditorAnimationEvent(30, onEvent));

			const group = new EditorAnimationGroup("group", scene);
			group.addTargetedAnimation(animation, target);

			const onEnd = vi.fn();
			group.onAnimationGroupEndObservable.add(onEnd);

			group.start(false, 1);

			stepTestScene(engine, scene, 15, 1000 / 60);
			expect(target.value).toBeCloseTo(15, 1);
			expect(onEvent).not.toHaveBeenCalled();

			stepTestScene(engine, scene, 20, 1000 / 60);
			expect(target.value).toBeCloseTo(35, 1);
			expect(onEvent).toHaveBeenCalledTimes(1);

			stepTestScene(engine, scene, 40, 1000 / 60);
			expect(target.value).toBe(60);
			expect(onEnd).toHaveBeenCalledTimes(1);
			expect(group.isPlaying).toBeFalsy();
		});

		test("should loop and go to the given frame", () => {
			const { engine, scene } = createTestScene();

			const target = { value: 0 };
			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 60, value: 60 },
			]);

			const group = new EditorAnimationGroup("group", scene);
			group.addTargetedAnimation(animation, target);

			const onLoop = vi.fn();
			group.onAnimationGroupLoopObservable.add(onLoop);

			group.start(true, 2);
			stepTestScene(engine, scene, 45, 1000 / 60);

			expect(onLoop).toHaveBeenCalled();
			expect(group.isPlaying).toBeTruthy();

			group.pause();
			group.goToFrame(15);
			expect(target.value).toBe(15);
		});

		test("should clone the animation group with new targets", () => {
			const { scene } = createTestScene();

			const target = { value: 0 };
			const newTarget = { value: 0 };

			const animation = new EditorAnimation("a", "value", 60, EditorAnimation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 60, value: 60 },
			]);

			const group = new EditorAnimationGroup("group", scene);
			group.addTargetedAnimation(animation, target);

			const clone = group.clone("clone", () => newTarget);
			clone.goToFrame(30);

			expect(newTarget.value).toBe(30);
			expect(target.value).toBe(0);
		});
	});
});
