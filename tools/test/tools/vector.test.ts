import { describe, expect, test } from "vitest";

import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { parseAxis } from "../../src/tools/vector";

describe("tools/vector", () => {
	describe("parseAxis", () => {
		test("should return the correct axis value", () => {
			expect(parseAxis([1, 0, 0])).toBe(Axis.X);
			expect(parseAxis([0, 1, 0])).toBe(Axis.Y);
			expect(parseAxis([0, 0, 1])).toBe(Axis.Z);
		});

		test("should return current vector if it doesn't match any axis", () => {
			const vector = [0.5, 0.5, 0.5];
			expect(parseAxis(vector).equals(Vector3.FromArray(vector))).toBeTruthy();
		});
	});
});
