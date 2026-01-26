import { describe, expect, test, vi } from "vitest";

import { waitNextAnimationFrame, unique, UniqueNumber, sortAlphabetically, getCurrentCallStack } from "../../src/tools/tools";

describe("tools/tools", () => {
	describe("waitNextAnimationFrame", () => {
		test("should call requestAnimationFrame to wait", async () => {
			(globalThis as any).requestAnimationFrame = vi.fn((callback) => {
				setTimeout(callback, 0);
			});

			const requestAnimationFrameSpy = vi.spyOn(globalThis, "requestAnimationFrame");
			await waitNextAnimationFrame();
			expect(requestAnimationFrameSpy).toHaveBeenCalled();
			requestAnimationFrameSpy.mockRestore();
		});
	});

	describe("unique", () => {
		test("should return an array with unique elements", () => {
			const array = [1, 2, 2, 3, 4, 4, 5];
			const uniqueArray = unique(array);
			expect(uniqueArray).toEqual([1, 2, 3, 4, 5]);
		});

		test("should return an empty array when input is empty", () => {
			const array: number[] = [];
			const uniqueArray = unique(array);
			expect(uniqueArray).toEqual([]);
		});
	});

	describe("UniqueNumber", () => {
		test("should generate unique numbers", () => {
			const uniqueNumber1 = UniqueNumber.Get();
			const uniqueNumber2 = UniqueNumber.Get();

			expect(uniqueNumber1).not.toEqual(uniqueNumber2);
		});

		test("should generate numbers in increasing order", () => {
			const uniqueNumbers = [UniqueNumber.Get(), UniqueNumber.Get(), UniqueNumber.Get()];

			expect(uniqueNumbers[0]).toBeLessThan(uniqueNumbers[1]);
			expect(uniqueNumbers[1]).toBeLessThan(uniqueNumbers[2]);
		});
	});

	describe("sortAlphabetically", () => {
		test("should sort an array of strings alphabetically", () => {
			const array = ["banana", "apple", "cherry"];
			const sortedArray = sortAlphabetically(array);
			expect(sortedArray).toEqual(["apple", "banana", "cherry"]);
		});

		test("should sort an array of objects by a specified property", () => {
			const array = [{ name: "banana" }, { name: "apple" }, { name: "cherry" }];
			const sortedArray = sortAlphabetically(array, "name");
			expect(sortedArray).toEqual([{ name: "apple" }, { name: "banana" }, { name: "cherry" }]);
		});
	});

	describe("getCurrentCallStack", () => {
		test("should return the current call stack", () => {
			const callStack = getCurrentCallStack();
			expect(typeof callStack).toBe("string");
		});
	});
});
