import { wait, waitNextAnimationFrame, waitUntil, unique, UniqueNumber, sortAlphabetically, getCurrentCallStack } from "../../src/tools/tools";

describe("tools/tools", () => {
	describe("wait", () => {
		test("should wait the given time", async () => {
			const previousTime = performance.now();
			await wait(150);
			const now = performance.now();

			expect(now - previousTime).toBeGreaterThanOrEqual(150);
		});
	});

	describe("waitNextAnimationFrame", () => {
		test("should call requestAnimationFrame to wait", async () => {
			(globalThis as any).requestAnimationFrame = jest.fn((callback) => {
				setTimeout(callback, 0);
			});

			const requestAnimationFrameSpy = jest.spyOn(globalThis, "requestAnimationFrame");
			await waitNextAnimationFrame();
			expect(requestAnimationFrameSpy).toHaveBeenCalled();
			requestAnimationFrameSpy.mockRestore();
		});
	});

	describe("waitUntil", () => {
		test("should wait until the predicate returns true", async () => {
			let counter = 0;
			const predicate = () => counter === 3;

			setTimeout(() => {
				counter = 3;
			}, 150);

			const previousTime = performance.now();
			await waitUntil(predicate);
			const now = performance.now();

			expect(now - previousTime).toBeGreaterThanOrEqual(150);
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
