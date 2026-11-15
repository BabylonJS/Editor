import { describe, expect, test, vi } from "vitest";

import { EngineContext, Mesh, SceneContext } from "@babylonjs/lite";

import { _getKernelBlurParameters, _nearestBestKernel } from "../../src/rendering/default/blur";
import { GlowLayer } from "../../src/rendering/default/glow-layer";
import { _getSerializedTextureMatrix } from "../../src/rendering/post-process/mesh-materials";
import { _getWhiteBalanceMatrix, IImageProcessingDefines, ImageProcessingConfiguration } from "../../src/rendering/default/image-processing";
import { buildPostProcessShader, expandPostProcessShaderIncludes, registerPostProcessShaderInclude } from "../../src/rendering/post-process/shader";
import { IPostProcessTexture, PostProcessPass } from "../../src/rendering/post-process/pass";

/**
 * Returns the defines of the given string of defines of Babylon.js ("#define NAME value" lines).
 */
function parseBabylonDefines(defines: string): Record<string, string> {
	const result: Record<string, string> = {};
	defines
		.split("\n")
		.filter((line) => line.startsWith("#define "))
		.forEach((line) => {
			const [, name, value] = line.split(" ");
			result[name] = value;
		});

	return result;
}

/**
 * Creates an engine with a fake device counting the calls of the WebGPU API made by the passes.
 */
function createFakeEngine(): { engine: EngineContext; calls: Record<string, number> } {
	const calls: Record<string, number> = { writeBuffer: 0, createBindGroup: 0, createBindGroupLayout: 0, createRenderPipeline: 0, beginRenderPass: 0 };
	const count = <T>(name: string, value: T) => {
		calls[name] = (calls[name] ?? 0) + 1;
		return value;
	};

	const device = {
		createBuffer: () => ({ destroy: () => {} }),
		createBindGroupLayout: () => count("createBindGroupLayout", {}),
		createPipelineLayout: () => ({}),
		createBindGroup: () => count("createBindGroup", {}),
		createShaderModule: () => ({}),
		createRenderPipeline: () => count("createRenderPipeline", {}),
		createSampler: () => ({}),
		queue: { writeBuffer: () => count("writeBuffer", undefined) },
	};

	const renderPass = { setPipeline: () => {}, setBindGroup: () => {}, draw: () => {}, end: () => {} };
	const encoder = { beginRenderPass: () => count("beginRenderPass", renderPass) };

	return { engine: { _device: device, _currentEncoder: encoder } as unknown as EngineContext, calls };
}

function createDefines(): IImageProcessingDefines {
	return {
		IMAGEPROCESSING: false,
		WHITEBALANCE: false,
		VIGNETTE: false,
		VIGNETTEBLENDMODEMULTIPLY: false,
		VIGNETTEBLENDMODEOPAQUE: false,
		TONEMAPPING: 0,
		CONTRAST: false,
		EXPOSURE: false,
		COLORCURVES: false,
		COLORGRADING: false,
		COLORGRADING3D: false,
		SAMPLER3DGREENDEPTH: false,
		SAMPLER3DBGRMAP: false,
		DITHER: false,
		IMAGEPROCESSINGPOSTPROCESS: false,
		SKIPFINALCOLORCLAMP: false,
	};
}

describe("rendering/post-process", () => {
	describe("kernel blur", () => {
		test("should round the kernels as Babylon.js does", () => {
			expect([3, 7, 16, 32, 64].map((kernel) => _nearestBestKernel(kernel))).toEqual([3, 5, 17, 33, 65]);
		});

		// Values computed by "ThinBlurPostProcess._updateParameters" of Babylon.js 9.27 with WebGPU (16 varyings).
		test("should compute the same offsets and weights as Babylon.js", () => {
			const blur9 = _getKernelBlurParameters(9, 16, false);
			expect(blur9.defines).toEqual(
				parseBabylonDefines(
					"#define KERNEL_OFFSET0 -3.12252321\n#define KERNEL_WEIGHT0 0.02714365\n#define KERNEL_OFFSET1 3.12252321\n#define KERNEL_WEIGHT1 0.02714365\n#define KERNEL_OFFSET2 -1.30074558\n#define KERNEL_WEIGHT2 0.32317014\n#define KERNEL_OFFSET3 1.30074558\n#define KERNEL_WEIGHT3 0.32317014\n#define KERNEL_OFFSET4 0.\n#define KERNEL_WEIGHT4 0.29937241\n"
				)
			);
			expect(blur9.indexParameters).toEqual({ varyingCount: 5, depCount: 0 });
		});

		test("should move the samples exceeding the varyings to the dependent samples", () => {
			const blur33 = _getKernelBlurParameters(33, 16, false);
			expect(blur33.indexParameters).toEqual({ varyingCount: 14, depCount: 3 });
			expect(blur33.defines.KERNEL_OFFSET13).toBe("3.46927703");
			expect(blur33.defines.KERNEL_DEP_OFFSET0).toBe("-1.48681946");
			expect(blur33.defines.KERNEL_DEP_WEIGHT0).toBe("0.14350044");
			expect(blur33.defines.KERNEL_DEP_OFFSET2).toBe("0.");
			expect(blur33.defines.KERNEL_DEP_WEIGHT2).toBe("0.07494756");
		});

		test("should take the center weight of the blurs of the depth of field", () => {
			const dof = _getKernelBlurParameters(15, 16, true);
			expect(dof.defines.DOF).toBe(1);
			expect(dof.defines.CENTER_WEIGHT).toBe("0.24175061");
			expect(dof.defines.KERNEL_OFFSET6).toBe("-0.47705694");
			expect(dof.defines.KERNEL_OFFSET7).toBeUndefined();
			expect(dof.indexParameters).toEqual({ varyingCount: 7, depCount: 0 });
		});
	});

	describe("image processing", () => {
		test("should compute the white balance matrix as Babylon.js does", () => {
			// "GetWhiteBalanceMatrix(4000, 20)" of Babylon.js 9.27.
			const expected = [
				0.897332489490509, 0.006879424676299095, 0.02480991743505001, -0.15265850722789764, 1.032960295677185, 0.09541589766740799, -0.04920000582933426,
				-0.022221781313419342, 2.066255569458008,
			];

			_getWhiteBalanceMatrix(4000, 20).forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
		});

		test("should prepare the defines as Babylon.js does", () => {
			const configuration = new ImageProcessingConfiguration();
			const defines = createDefines();

			configuration.prepareDefines(defines);
			expect(defines.IMAGEPROCESSING).toBe(false);
			expect(defines.IMAGEPROCESSINGPOSTPROCESS).toBe(false);

			configuration.exposure = 1.5;
			configuration.toneMappingEnabled = true;
			configuration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
			configuration.prepareDefines(defines);
			expect(defines.EXPOSURE).toBe(true);
			expect(defines.TONEMAPPING).toBe(2);
			expect(defines.IMAGEPROCESSING).toBe(true);

			configuration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
			configuration.prepareDefines(defines);
			expect(defines.TONEMAPPING).toBe(3);
		});

		test("should only output the linear color in the materials when applied by a post-process", () => {
			const configuration = new ImageProcessingConfiguration();
			configuration.exposure = 2;
			configuration.vignetteEnabled = true;
			configuration.applyByPostProcess = true;

			const materialDefines = createDefines();
			configuration.prepareDefines(materialDefines, false);
			expect(materialDefines.IMAGEPROCESSINGPOSTPROCESS).toBe(true);
			expect(materialDefines.IMAGEPROCESSING).toBe(false);
			expect(materialDefines.EXPOSURE).toBe(false);
			expect(materialDefines.VIGNETTE).toBe(false);

			const postProcessDefines = createDefines();
			configuration.prepareDefines(postProcessDefines, true);
			expect(postProcessDefines.IMAGEPROCESSING).toBe(true);
			expect(postProcessDefines.EXPOSURE).toBe(true);
			expect(postProcessDefines.VIGNETTE).toBe(true);
		});
	});

	describe("glow layer", () => {
		// Values computed by "Texture.getTextureMatrix" of Babylon.js 9.27.
		test("should compute the texture matrices as Babylon.js does", () => {
			const expect16 = (values: number[], expected: number[]) => values.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));

			expect16(_getSerializedTextureMatrix({}), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
			expect16(_getSerializedTextureMatrix({ uScale: 500, vScale: 250, uOffset: 0.25, vOffset: -0.5 }), [500, 0, 0, 0, 0, 250, 0, 0, 0.25, -0.5, 0, 0, 0, 0, 0, 1]);
			expect16(
				_getSerializedTextureMatrix({ uScale: 2, vScale: 3, wAng: 0.7, uOffset: 0.1 }),
				[1.5296844244003296, 1.2884353399276733, 0, 0, -1.9326529502868652, 2.2945265769958496, 0, 0, 1.3014843463897705, -0.29148098826408386, 0, 0, 0, 0, 0, 1]
			);
			expect16(
				_getSerializedTextureMatrix({ uAng: 0.3, vAng: -0.2, wAng: 1.1, uScale: 1.5, vScale: 0.5, vOffset: 0.2 }),
				[
					0.5883463621139526, 1.277104377746582, 0.5223532915115356, 0, -0.45003676414489746, 0.21666845679283142, -0.022840380668640137, 0, 0.7757432460784912,
					-0.1491263210773468, -0.21790315210819244, 0, 0, 0, 0, 1,
				]
			);
		});

		test("should select the meshes as Babylon.js does", () => {
			const scene = { surface: { engine: {} }, meshes: [] } as unknown as SceneContext;
			const layer = new GlowLayer("glow", scene);

			const a = { uniqueId: 1 } as unknown as Mesh;
			const b = { uniqueId: 2 } as unknown as Mesh;

			expect(layer.hasMesh(a)).toBe(true);

			layer.addExcludedMesh(a);
			expect(layer.hasMesh(a)).toBe(false);
			expect(layer.hasMesh(b)).toBe(true);

			layer.addIncludedOnlyMesh(b);
			expect(layer.hasMesh(b)).toBe(true);
			expect(layer.hasMesh(a)).toBe(false);

			layer.removeIncludedOnlyMesh(b);
			layer.removeExcludedMesh(a);
			expect(layer.hasMesh(a)).toBe(true);

			layer.setExcludedByDefault(true);
			expect(layer.shouldRender()).toBe(false);

			layer.addIncludedOnlyMesh(a);
			expect(layer.shouldRender()).toBe(true);

			layer.setEffectIntensity(a, 0.5);
			expect(layer.getEffectIntensity(a)).toBe(0.5);
			expect(layer.getEffectIntensity(b)).toBe(1);

			// Default values of Babylon.js.
			expect(layer.intensity).toBe(1);
			expect(layer.blurKernelSize).toBe(32);
			expect(layer.neutralColor).toEqual({ r: 0, g: 0, b: 0, a: 1 });

			layer.dispose();
			expect(layer.isDisposed).toBe(true);
		});
	});

	describe("passes", () => {
		test("should create the GPU resources once and upload the uniforms only when they change", () => {
			vi.stubGlobal("GPUBufferUsage", { UNIFORM: 64, COPY_DST: 8 });
			vi.stubGlobal("GPUShaderStage", { VERTEX: 1, FRAGMENT: 2 });

			const { engine, calls } = createFakeEngine();
			const pass = new PostProcessPass(engine, {
				name: "test",
				fragment: `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform scale: f32;
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV)*uniforms.scale;
}`,
			});

			const texture = (format: GPUTextureFormat): IPostProcessTexture => ({ view: {} as GPUTextureView, width: 4, height: 4, format });
			const target = { view: {} as GPUTextureView, width: 4, height: 4, format: "rgba16float" as GPUTextureFormat };
			const input = texture("rgba16float");

			pass.setTexture("textureSampler", input);
			pass.uniforms.set("scale", 2);
			expect(pass.draw(target)).toBe(1);
			expect(pass.draw(target)).toBe(1);
			expect(calls).toMatchObject({ writeBuffer: 1, createBindGroup: 1, createBindGroupLayout: 1, createRenderPipeline: 1, beginRenderPass: 2 });

			// Uniforms changed.
			pass.uniforms.set("scale", 3);
			pass.draw(target);
			expect(calls.writeBuffer).toBe(2);

			// Same texture bound again, then another texture of the same format.
			pass.setTexture("textureSampler", input);
			pass.draw(target);
			expect(calls.createBindGroup).toBe(1);

			const other = texture("rgba16float");
			pass.setTexture("textureSampler", other);
			pass.draw(target);
			expect(calls.createBindGroup).toBe(2);
			expect(calls.createBindGroupLayout).toBe(1);

			// Textures alternating from one frame to the next (history of the TAA).
			pass.setTexture("textureSampler", input);
			pass.draw(target);
			pass.setTexture("textureSampler", other);
			pass.draw(target);
			expect(calls.createBindGroup).toBe(2);

			// A 32 bits float texture can't be filtered: other layout, bind group and pipeline.
			pass.setTexture("textureSampler", texture("r32float"));
			pass.draw(target);
			expect(calls).toMatchObject({ createBindGroup: 3, createBindGroupLayout: 2, createRenderPipeline: 2 });

			// Other format of the target.
			pass.draw({ ...target, format: "rgba8unorm" });
			expect(calls.createRenderPipeline).toBe(3);

			// The orientation of the target is a uniform.
			pass.draw({ ...target, format: "rgba8unorm", topDown: true });
			expect(calls.createRenderPipeline).toBe(3);
			expect(calls.writeBuffer).toBe(3);

			vi.unstubAllGlobals();
		});
	});

	describe("shader adapter", () => {
		test("should expand the includes as the shader processor of Babylon.js does", () => {
			registerPostProcessShaderInclude("testInclude", "let value{X}=SOURCE;");

			expect(expandPostProcessShaderIncludes("#include<testInclude>(SOURCE,1.0)")).toBe("let value{X}=1.0;");
			expect(expandPostProcessShaderIncludes("#include<testInclude>(SOURCE,2.0)[0..count]", { count: 2 })).toBe("let value0=2.0;\nlet value1=2.0;");
			expect(() => expandPostProcessShaderIncludes("#include<unknownInclude>")).toThrow();
		});

		test("should build the bindings and the uniforms of a Babylon.js shader", () => {
			const shader = buildPostProcessShader({
				name: "test",
				fragment: `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var depthSampler: texture_2d<f32>;
uniform scale: f32;
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
let depth=textureLoad(depthSampler,vec2<i32>(fragmentInputs.position.xy),0).r;
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV)*uniforms.scale*depth;
}`,
			});

			expect(shader.bindings[0]).toMatchObject({ binding: 0, kind: "uniform" });
			expect(shader.bindings.find((binding) => binding.name === "textureSampler")?.kind).toBe("texture");
			expect(shader.bindings.find((binding) => binding.name === "textureSamplerSampler")?.kind).toBe("sampler");
			expect(shader.outputCount).toBe(1);

			// The uniforms of the shader, then the internal fields of the adapter.
			const fields = Array.from(shader.uniforms.fields.keys());
			expect(fields).toContain("scale");
			expect(fields).toContain("bjsYFactor");
			expect(fields).toContain("bjsTargetSize");
			expect(fields).toContain("bjsFlip_textureSampler");
			expect(fields).toContain("bjsFlip_depthSampler");

			// The 2D textures are flipped vertically when they store their first row at the top of the image.
			expect(shader.fragmentCode).toContain("bjsFlipUV(");
			expect(shader.fragmentCode).toContain("bjsFlipTexel(");
			expect(shader.fragmentCode).toContain("fn bjsFragment(");
			expect(shader.vertexCode).toContain("fn bjsVertex(");
		});
	});
});
