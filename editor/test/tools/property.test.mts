import { describe, expect, test } from "vitest";

import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../src/tools/property";

describe("tools/property", () => {
	describe("getInspectorPropertyValue", () => {
		test("should return the value located at the given property path", () => {
			const o = {
				a: {
					b: {
						c: 42,
					},
				},
				b: {
					c: 43,
				},
				c: 44,
			};

			expect(getInspectorPropertyValue(o, "c")).toBe(44);
			expect(getInspectorPropertyValue(o, "a.b.c")).toBe(42);
			expect(getInspectorPropertyValue(o, "b.c")).toBe(43);
		});
	});

	describe("setInspectorEffectivePropertyValue", () => {
		test("should set the value located at the given property path", () => {
			const o = {
				a: {
					b: {
						c: 42,
					},
				},
				b: {
					c: 43,
				},
				c: 44,
			};

			setInspectorEffectivePropertyValue(o, "c", 45);
			expect(o.c).toBe(45);

			setInspectorEffectivePropertyValue(o, "a.b.c", 46);
			expect(o.a.b.c).toBe(46);

			setInspectorEffectivePropertyValue(o, "b.c", 47);
			expect(o.b.c).toBe(47);
		});
	});
});
