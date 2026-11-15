import { describe, test, expect } from "vitest";

import { EditorAnimation } from "../../src/animation/animation";
import { getAnimationTypeForObject } from "../../src/tools/animation";

describe("tools/animation", () => {
	describe("getAnimationTypeForObject", () => {
		test("should return the type of animation according to the type of the given property", () => {
			expect(getAnimationTypeForObject(1)).toBe(EditorAnimation.ANIMATIONTYPE_FLOAT);

			expect(getAnimationTypeForObject({ x: 0, y: 0 })).toBe(EditorAnimation.ANIMATIONTYPE_VECTOR2);
			expect(getAnimationTypeForObject({ x: 0, y: 0, z: 0 })).toBe(EditorAnimation.ANIMATIONTYPE_VECTOR3);

			expect(getAnimationTypeForObject({ x: 0, y: 0, z: 0, w: 1 })).toBe(EditorAnimation.ANIMATIONTYPE_QUATERNION);

			expect(getAnimationTypeForObject({ r: 0, g: 0, b: 0 })).toBe(EditorAnimation.ANIMATIONTYPE_COLOR3);
			expect(getAnimationTypeForObject({ r: 0, g: 0, b: 0, a: 1 })).toBe(EditorAnimation.ANIMATIONTYPE_COLOR4);

			expect(getAnimationTypeForObject([0, 0, 0])).toBe(EditorAnimation.ANIMATIONTYPE_COLOR3);
			expect(getAnimationTypeForObject([0, 0, 0, 1])).toBe(EditorAnimation.ANIMATIONTYPE_COLOR4);

			expect(getAnimationTypeForObject({ width: 8, height: 8 })).toBe(EditorAnimation.ANIMATIONTYPE_SIZE);

			expect(getAnimationTypeForObject(new Float32Array(16))).toBe(EditorAnimation.ANIMATIONTYPE_MATRIX);
		});

		test("should return null for unsupported types", () => {
			expect(getAnimationTypeForObject("some string")).toBe(null);
			expect(getAnimationTypeForObject({})).toBe(null);
			expect(getAnimationTypeForObject(Object)).toBe(null);

			expect(getAnimationTypeForObject(null)).toBe(null);
			expect(getAnimationTypeForObject(undefined)).toBe(null);
			expect(getAnimationTypeForObject(NaN)).toBe(null);
		});
	});
});
