import { describe, expect, test } from "vitest";

import { cloneJSObject, randomId } from "../../src/tools/tools";

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

	describe("randomId", () => {
		test("should return a new GUID each call", () => {
			const id = randomId();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
			expect(randomId()).not.toBe(id);
		});
	});
});
