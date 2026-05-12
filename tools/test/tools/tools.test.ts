import { describe, expect, test } from "vitest";

import { cloneJSObject } from "../../src/tools/tools";

describe("tools/tools", () => {
	describe("cloneJSObject", () => {
		test("should clone a JavaScript object", () => {
			const obj = { a: 1, b: { c: 2 } };
			const clonedObj = cloneJSObject(obj);
			expect(clonedObj).toEqual(obj);
			expect(clonedObj).not.toBe(obj);
			expect(clonedObj.b).not.toBe(obj.b);
		});

		test("should return null or undefined as is", () => {
			expect(cloneJSObject(null)).toBeNull();
			expect(cloneJSObject(undefined)).toBeUndefined();
		});
	});
});
