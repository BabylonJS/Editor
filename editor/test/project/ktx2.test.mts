import { describe, expect, test } from "vitest";

import { nearestPowerOfTwo } from "../../src/project/export/ktx2";

describe("project/export/ktx2", () => {
	describe("nearestPowerOfTwo", () => {
		test("keeps a power of two as it is", () => {
			for (const size of [4, 256, 1024, 4096]) {
				expect(nearestPowerOfTwo(size)).toBe(size);
			}
		});

		test("rounds the sizes the tavern scene failed on to the nearest power of two", () => {
			expect(nearestPowerOfTwo(9216)).toBe(8192);
			expect(nearestPowerOfTwo(1618)).toBe(2048);
			expect(nearestPowerOfTwo(519)).toBe(512);
			expect(nearestPowerOfTwo(349)).toBe(256);
			expect(nearestPowerOfTwo(300)).toBe(256);
			expect(nearestPowerOfTwo(134)).toBe(128);
		});

		test("never goes under one 4x4 block", () => {
			expect(nearestPowerOfTwo(1)).toBe(4);
			expect(nearestPowerOfTwo(3)).toBe(4);
		});

		test("always yields a multiple of four", () => {
			for (let size = 1; size <= 5000; size += 7) {
				expect(nearestPowerOfTwo(size) % 4).toBe(0);
			}
		});
	});
});
