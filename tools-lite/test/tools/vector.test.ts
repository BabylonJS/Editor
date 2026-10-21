import { describe, expect, test } from "vitest";

import { parseAxis } from "../../src/tools/vector";

describe("tools/vector", () => {
	describe("parseAxis", () => {
		test("should return the correct axis value", () => {
			expect(parseAxis([1, 0, 0])).toEqual({ x: 1, y: 0, z: 0 });
			expect(parseAxis([0, 1, 0])).toEqual({ x: 0, y: 1, z: 0 });
			expect(parseAxis([0, 0, 1])).toEqual({ x: 0, y: 0, z: 1 });
		});

		test("should return current vector if it doesn't match any axis", () => {
			expect(parseAxis([0.5, 0.5, 0.5])).toEqual({ x: 0.5, y: 0.5, z: 0.5 });
		});
	});
});
