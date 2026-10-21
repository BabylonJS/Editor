import { describe, expect, test } from "vitest";

import { buildWGSLEffectShader, preprocessWGSL, WGSLUniformWriter } from "../../src/rendering/wgsl";

describe("rendering/wgsl", () => {
	describe("preprocessWGSL", () => {
		test("should keep the branches of the defined values", () => {
			const source = ["#ifdef A", "a", "#else", "not-a", "#endif", "#ifndef B", "not-b", "#endif"].join("\n");

			expect(preprocessWGSL(source, { A: true })).toBe("a\nnot-b");
			expect(preprocessWGSL(source, { A: false, B: 1 })).toBe("not-a");
		});

		test("should evaluate the conditions of the #if and #elif directives", () => {
			const source = ["#if COUNT > 2 && defined(A)", "many", "#elif COUNT == 1 || COUNT == 2", "few", "#else", "none", "#endif"].join("\n");

			expect(preprocessWGSL(source, { COUNT: 3, A: true })).toBe("many");
			expect(preprocessWGSL(source, { COUNT: 3 })).toBe("none");
			expect(preprocessWGSL(source, { COUNT: 2 })).toBe("few");
			expect(preprocessWGSL(source, {})).toBe("none");
			expect(preprocessWGSL("#if !(A == 1)\nyes\n#endif", { A: 2 })).toBe("yes");
		});

		test("should handle the nested blocks and the indented directives", () => {
			const source = ["#ifdef A", "\t#if B == 1", "\t\tab", "\t#else", "\t\ta", "\t#endif", "#else", "\t#ifdef B", "\t\tb", "\t#endif", "#endif"].join("\n");

			expect(preprocessWGSL(source, { A: true, B: 1 })).toBe("\t\tab");
			expect(preprocessWGSL(source, { A: true, B: 0 })).toBe("\t\ta");
			expect(preprocessWGSL(source, { B: 0 })).toBe("\t\tb");
			expect(preprocessWGSL(source, {})).toBe("");
		});

		test("should replace the defines by their values and support #define", () => {
			const source = ["#define LOCAL 4", "var a: array<f32, COUNT>;", "let b = LOCAL + COUNT_2;"].join("\n");

			expect(preprocessWGSL(source, { COUNT: 3, COUNT_2: 5 })).toBe("var a: array<f32, 3>;\nlet b = 4 + 5;");
		});

		test("should throw on unbalanced blocks", () => {
			expect(() => preprocessWGSL("#ifdef A\na", {})).toThrow();
			expect(() => preprocessWGSL("#endif", {})).toThrow();
		});
	});

	describe("buildWGSLEffectShader", () => {
		test("should lay out the uniforms as the uniform address space of WGSL does", () => {
			const shader = buildWGSLEffectShader(
				[
					"uniform a: f32;",
					"uniform b: vec3f;",
					"uniform c: f32;",
					"uniform d: vec2f;",
					"uniform e: mat4x4f;",
					"uniform f: array<vec4f, 3>;",
					"uniform g: f32;",
					"fn main() {}",
				].join("\n")
			);

			const fields = shader.uniforms!.fields;

			expect(fields.get("a")!.offset).toBe(0);
			expect(fields.get("b")!.offset).toBe(4);
			expect(fields.get("c")!.offset).toBe(7);
			expect(fields.get("d")!.offset).toBe(8);
			expect(fields.get("e")!.offset).toBe(12);
			expect(fields.get("f")!.offset).toBe(28);
			expect(fields.get("g")!.offset).toBe(40);
			expect(shader.uniforms!.byteLength).toBe(176);

			expect(shader.fragmentWGSL).toContain("@group(0) @binding(0) var<uniform> uniforms: EffectUniforms;");
			expect(shader.fragmentWGSL).toContain("fn main() {}");
			expect(shader.fragmentWGSL).not.toContain("uniform a: f32;");
		});

		test("should declare the textures and their samplers", () => {
			const shader = buildWGSLEffectShader(
				[
					"uniform a: vec4f;",
					"var colorSampler: sampler;",
					"var color: texture_2d<f32>;",
					"var depth: texture_2d<f32>;",
					"var shadowSampler: sampler_comparison;",
					"var shadow: texture_depth_2d_array;",
					"var<private> value: f32;",
				].join("\n")
			);

			expect(shader.bindings).toEqual([
				{ name: "uniforms", binding: 0, kind: "uniform", uniformByteLength: 16 },
				{ name: "color", binding: 1, kind: "texture", textureSampleType: "float", viewDimension: "2d" },
				{ name: "depth", binding: 2, kind: "texture", textureSampleType: "unfilterable-float", viewDimension: "2d" },
				{ name: "shadow", binding: 3, kind: "texture", textureSampleType: "depth", viewDimension: "2d-array" },
				{ name: "colorSampler", binding: 4, kind: "sampler", samplerType: "filtering", textureBinding: "color" },
				{ name: "shadowSampler", binding: 5, kind: "sampler", samplerType: "comparison", textureBinding: "shadow" },
			]);

			expect(shader.fragmentWGSL).toContain("@group(0) @binding(5) var shadowSampler: sampler_comparison;");
			expect(shader.fragmentWGSL).toContain("var<private> value: f32;");
		});

		test("should write the values of the uniforms at their offsets", () => {
			const shader = buildWGSLEffectShader(["uniform a: f32;", "uniform b: vec3f;", "uniform c: array<vec4f, 2>;"].join("\n"));
			const writer = new WGSLUniformWriter(shader.uniforms!);

			writer.set("a", 1);
			writer.set("b", 2, 3, 4);
			writer.setArray("c", [5, 6, 7, 8, 9, 10, 11, 12]);
			writer.set("unknown", 13);

			expect(Array.from(writer.data)).toEqual([1, 0, 0, 0, 2, 3, 4, 0, 5, 6, 7, 8, 9, 10, 11, 12]);
		});
	});
});
