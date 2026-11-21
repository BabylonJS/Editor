import { describe, expect, test } from "vitest";

import { getNearestPowerOfTwo } from "../../../src/tools/maths/scalar";

describe("tools/maths/scalar", () => {
	describe("getNearestPowerOfTwo", () => {
		test("keeps a power of two as it is", () => {
			for (const size of [1, 4, 256, 1024, 4096]) {
				expect(getNearestPowerOfTwo(size)).toBe(size);
			}
		});

		test("rounds to the nearest power of two", () => {
			expect(getNearestPowerOfTwo(9216)).toBe(8192);
			expect(getNearestPowerOfTwo(1618)).toBe(2048);
			expect(getNearestPowerOfTwo(519)).toBe(512);
			expect(getNearestPowerOfTwo(349)).toBe(256);
			expect(getNearestPowerOfTwo(300)).toBe(256);
			expect(getNearestPowerOfTwo(134)).toBe(128);
		});

		test("never goes under the given minimum", () => {
			expect(getNearestPowerOfTwo(1, 4)).toBe(4);
			expect(getNearestPowerOfTwo(3, 4)).toBe(4);
			expect(getNearestPowerOfTwo(0)).toBe(1);
		});

		test("always yields a multiple of four with a minimum of 4", () => {
			for (let size = 1; size <= 5000; size += 7) {
				expect(getNearestPowerOfTwo(size, 4) % 4).toBe(0);
			}
		});
	});
});
