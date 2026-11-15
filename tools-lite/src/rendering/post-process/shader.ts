import { IWGSLUniformLayout, preprocessWGSL, WGSLDefines } from "../wgsl";

/**
 * Defines the source of a post-process shader written for Babylon.js (WGSL): the shaders of the post-processes of
 * Babylon.js are ported almost as is so they compute exactly the same values.
 */
export interface IPostProcessShaderSource {
	/**
	 * Defines the name of the shader (used as label of the GPU objects).
	 */
	name: string;
	/**
	 * Defines the source of the fragment stage, declared as Babylon.js does ("fn main(input: FragmentInputs) -> FragmentOutputs").
	 */
	fragment: string;
	/**
	 * Defines the source of the vertex stage, declared as Babylon.js does. Defaults to the "postprocess" vertex shader of Babylon.js.
	 */
	vertex?: string;
}

/**
 * Defines the options used to build a post-process shader.
 */
export interface IPostProcessShaderOptions {
	/**
	 * Defines the values of the defines of the shader (see `preprocessWGSL`).
	 */
	defines?: WGSLDefines;
	/**
	 * Defines the values of the index parameters of the includes repeated using "#include<name>[0..parameter]".
	 */
	indexParameters?: Record<string, number>;
	/**
	 * Defines the textures that are not flipped vertically when sampled (see `IPostProcessShader`). The textures storing
	 * images with their first row at the bottom, as Babylon.js does with the textures it loads with "invertY = false",
	 * the 3D textures and the cube textures are sampled as is.
	 */
	unflippedTextures?: string[];
}

/**
 * Defines a binding of the group 0 of a post-process shader.
 */
export interface IPostProcessShaderBinding {
	name: string;
	binding: number;
	kind: "uniform" | "texture" | "sampler";
	/**
	 * Defines the dimension of the view of the texture.
	 */
	viewDimension?: GPUTextureViewDimension;
	/**
	 * Defines the sample type of the texture ("float" for the textures sampled through a sampler, "unfilterable-float"
	 * for the textures read using "textureLoad" only and "depth" for the depth textures).
	 */
	sampleType?: GPUTextureSampleType;
	/**
	 * Defines the name of the texture sampled by the sampler.
	 */
	texture?: string;
	/**
	 * Defines the type of the sampler.
	 */
	samplerType?: GPUSamplerBindingType;
}

/**
 * Defines a post-process shader built from the sources of a Babylon.js shader.
 *
 * The coordinates computed by the shaders of Babylon.js follow the conventions of WebGL, which Babylon.js reproduces
 * with WebGPU: "vUV" and "fragmentInputs.position" have their origin at the bottom-left corner of the target, and the
 * render targets are drawn upside down so their first row is the bottom of the image ("yFactor_" of Babylon.js). The
 * shaders built here do the same (see the "bjsYFactor" uniform): the textures drawn by the passes are stored as
 * Babylon.js stores its render targets, and the varyings are interpolated exactly the same way. The textures of Babylon
 * Lite store their first row at the top: the vertical coordinate is flipped when one of them is sampled (see the
 * "bjsFlip_<texture>" uniforms).
 */
export interface IPostProcessShader {
	/**
	 * Defines the name of the shader.
	 */
	name: string;
	/**
	 * Defines the WGSL code of the vertex stage (entry point "bjsVertex").
	 */
	vertexCode: string;
	/**
	 * Defines the WGSL code of the fragment stage (entry point "bjsFragment").
	 */
	fragmentCode: string;
	/**
	 * Defines the bindings of the group 0 of the shader module. The binding 0 is always the uniform buffer.
	 */
	bindings: IPostProcessShaderBinding[];
	/**
	 * Defines the layout of the uniform buffer, which always contains the internal fields: "bjsYFactor" (-1 when
	 * drawing into a render target, 1 when drawing into the canvas), "bjsTargetSize" (size of the target in pixels, then
	 * its inverse) and the "bjsFlip_<texture>" fields of the 2D textures (1 when the texture stores its first row at the
	 * top of the image).
	 */
	uniforms: IWGSLUniformLayout;
	/**
	 * Defines the number of color outputs of the fragment stage (the fields "color", then "fragData1", "fragData2", etc.
	 * of the "FragmentOutputs" of Babylon.js).
	 */
	outputCount: number;
}

/**
 * Same as the "postprocess" vertex shader of Babylon.js (WGSL).
 */
export const postProcessVertexWGSL = `
attribute position: vec2<f32>;
uniform scale: vec2<f32>;
varying vUV: vec2<f32>;
const madd = vec2(0.5, 0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs) -> FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
	vertexOutputs.vUV = (vertexInputs.position * madd + madd) * uniforms.scale;
	vertexOutputs.position = vec4(vertexInputs.position, 0.0, 1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;

const includesStore = new Map<string, string>();

/**
 * Registers the source of a WGSL include of Babylon.js, used by the shaders through "#include<name>".
 * @param name defines the name of the include.
 * @param source defines the source of the include.
 */
export function registerPostProcessShaderInclude(name: string, source: string): void {
	includesStore.set(name, source);
}

/**
 * Expands the "#include<name>" directives of the given source the same way the shader processor of Babylon.js does:
 * - "#include<name>(a,b,c,d)" replaces "a" by "b" and "c" by "d" in the include,
 * - "#include<name>[0..count]" repeats the include "count" times ("count" is a number or an index parameter), replacing
 *   "{X}" by the index of the repetition.
 * @param source defines the source to process.
 * @param indexParameters defines the values of the index parameters.
 * @returns the source with its includes expanded.
 */
export function expandPostProcessShaderIncludes(source: string, indexParameters: Record<string, number> = {}): string {
	return source.replace(
		/#include\s*<(\w+)>(?:\(([^)]*)\))?(?:\[(\w+)\.\.(\w+)\])?/g,
		(_, name: string, replacements: string | undefined, start: string | undefined, end: string) => {
			let include = includesStore.get(name);
			if (include === undefined) {
				throw new Error(`Unknown post-process shader include "${name}".`);
			}

			if (replacements) {
				const parts = replacements.split(",").map((part) => part.trim());
				for (let i = 0; i + 1 < parts.length; i += 2) {
					include = include.split(parts[i]).join(parts[i + 1]);
				}
			}

			include = expandPostProcessShaderIncludes(include, indexParameters);

			if (start === undefined) {
				return include;
			}

			const resolve = (value: string) => (/^\d+$/.test(value) ? parseInt(value) : (indexParameters[value] ?? 0));
			const repeated: string[] = [];
			for (let i = resolve(start), count = resolve(end); i < count; ++i) {
				repeated.push(include.replace(/\{X\}/g, String(i)));
			}

			return repeated.join("\n");
		}
	);
}

interface IDeclarations {
	attributes: { name: string; type: string }[];
	varyings: { name: string; type: string }[];
	uniforms: { name: string; type: string }[];
	textures: { name: string; type: string }[];
	samplers: { name: string; type: string }[];
	body: string;
}

function parseDeclarations(source: string): IDeclarations {
	const declarations: IDeclarations = { attributes: [], varyings: [], uniforms: [], textures: [], samplers: [], body: "" };

	// The declarations of Babylon.js may share their line with other declarations or code.
	const body = source
		.replace(/\b(attribute|varying|uniform)\s+(\w+)\s*:\s*([^;]+);/g, (_, kind: string, name: string, type: string) => {
			const entry = { name, type: type.replace(/\s+/g, "") };
			if (kind === "attribute") {
				declarations.attributes.push(entry);
			} else if (kind === "varying") {
				declarations.varyings.push(entry);
			} else {
				declarations.uniforms.push(entry);
			}
			return "";
		})
		.replace(/\bvar\s+(\w+)\s*:\s*((?:texture|sampler)[^;]*);/g, (_, name: string, type: string) => {
			const entry = { name, type: type.replace(/\s+/g, "") };
			if (entry.type.startsWith("texture")) {
				declarations.textures.push(entry);
			} else {
				declarations.samplers.push(entry);
			}
			return "";
		});

	declarations.body = body;
	return declarations;
}

/**
 * Returns the index of the parenthesis closing the one at the given index.
 */
function findClosingParenthesis(code: string, openIndex: number): number {
	let depth = 0;
	for (let i = openIndex; i < code.length; ++i) {
		const c = code[i];
		if (c === "(") {
			++depth;
		} else if (c === ")") {
			if (--depth === 0) {
				return i;
			}
		}
	}

	throw new Error("Unbalanced parentheses in the post-process shader.");
}

/**
 * Splits the given arguments of a function call on its top level commas.
 */
function splitArguments(code: string): string[] {
	const result: string[] = [];

	let depth = 0;
	let current = "";
	for (const c of code) {
		if (c === "(" || c === "[") {
			++depth;
		} else if (c === ")" || c === "]") {
			--depth;
		}

		if (c === "," && depth === 0) {
			result.push(current.trim());
			current = "";
		} else {
			current += c;
		}
	}

	if (current.trim()) {
		result.push(current.trim());
	}

	return result;
}

/**
 * Rewrites the calls of the given functions in the given code.
 */
function rewriteCalls(code: string, functions: string[], rewrite: (name: string, args: string[]) => string | null): string {
	const regex = new RegExp(`\\b(${functions.join("|")})\\s*\\(`, "g");

	let result = "";
	let position = 0;

	let match: RegExpExecArray | null;
	while ((match = regex.exec(code))) {
		const openIndex = match.index + match[0].length - 1;
		const closeIndex = findClosingParenthesis(code, openIndex);

		// The arguments may contain calls to rewrite as well.
		const args = splitArguments(rewriteCalls(code.slice(openIndex + 1, closeIndex), functions, rewrite));
		const replacement = rewrite(match[1], args);

		result += code.slice(position, match.index) + (replacement ?? `${match[1]}(${args.join(", ")})`);
		position = closeIndex + 1;
		regex.lastIndex = position;
	}

	return result + code.slice(position);
}

/**
 * Returns the given texel offset with its vertical component negated. The offsets of the sampling functions must be
 * constant expressions: no function can be called.
 */
function flipOffset(offset: string): string {
	return `vec2<i32>((${offset}).x, -(${offset}).y)`;
}

const sampleFunctions = [
	"textureSample",
	"textureSampleLevel",
	"textureSampleBias",
	"textureSampleGrad",
	"textureSampleCompare",
	"textureSampleCompareLevel",
	"textureSampleBaseClampToEdge",
	"textureGather",
	"textureGatherCompare",
	"textureLoad",
	"dpdy",
	"dpdyFine",
	"dpdyCoarse",
];

/**
 * Returns the name of the uniform telling wether or not the given texture stores its first row at the top.
 */
function getFlipUniform(texture: string): string {
	return `bjsFlip_${texture}`;
}

/**
 * Flips the vertical coordinate of the 2D textures sampled or loaded by the given code when they store their first row
 * at the top, and the vertical derivatives as Babylon.js does (see `IPostProcessShader`).
 * @param code defines the code to process.
 * @param flippableTextures defines the textures that may be flipped, with the expression of their flag.
 */
function flipTextureAccesses(code: string, flippableTextures: Map<string, string>): string {
	return rewriteCalls(code, sampleFunctions, (name, args) => {
		if (name.startsWith("dpdy")) {
			// Same as Babylon.js: the vertical axis points down when drawing into the canvas.
			return `((-uniforms.bjsYFactor) * ${name}(${args.join(", ")}))`;
		}

		// "textureGather(component, texture, sampler, coords)" for the color textures.
		const textureIndex = name === "textureGather" && !flippableTextures.has(args[0]) ? 1 : 0;
		const texture = args[textureIndex];
		if (!flippableTextures.has(texture)) {
			return null;
		}

		const flip = flippableTextures.get(texture)!;
		const result = args.slice();

		if (name === "textureLoad") {
			const level = args[2] ?? "0";
			result[1] = `bjsFlipTexel(vec2<i32>(${args[1]}), vec2<i32>(textureDimensions(${texture}, ${level})), ${flip})`;
			return `${name}(${result.join(", ")})`;
		}

		const coordsIndex = textureIndex + 2;
		result[coordsIndex] = `bjsFlipUV(${args[coordsIndex]}, ${flip})`;

		// The offsets must be constant expressions: both samples are taken when an offset is given.
		let offsetIndex = -1;
		switch (name) {
			case "textureSampleGrad":
				result[coordsIndex + 1] = `bjsFlipVector(${args[coordsIndex + 1]}, ${flip})`;
				result[coordsIndex + 2] = `bjsFlipVector(${args[coordsIndex + 2]}, ${flip})`;
				offsetIndex = coordsIndex + 3;
				break;
			case "textureSample":
			case "textureGather":
				offsetIndex = coordsIndex + 1;
				break;
			case "textureSampleLevel":
			case "textureSampleBias":
			case "textureSampleCompare":
			case "textureSampleCompareLevel":
			case "textureGatherCompare":
				offsetIndex = coordsIndex + 2;
				break;
		}

		if (offsetIndex !== -1 && args[offsetIndex]) {
			const flipped = result.slice();
			flipped[offsetIndex] = flipOffset(args[offsetIndex]);
			return `select(${name}(${result.join(", ")}), ${name}(${flipped.join(", ")}), ${flip} > 0.5)`;
		}

		return `${name}(${result.join(", ")})`;
	});
}

/**
 * Defines a function of a shader having 2D texture parameters.
 */
interface ITextureFunction {
	/**
	 * Defines the indices of the 2D texture parameters.
	 */
	textureParameters: number[];
}

/**
 * Splits the parameters of a function declaration on their top level commas (the types may contain commas, ie.
 * "ptr<function, vec2f>").
 */
function splitParameters(code: string): string[] {
	const result: string[] = [];

	let depth = 0;
	let current = "";
	for (const c of code) {
		if (c === "(" || c === "[" || c === "<") {
			++depth;
		} else if (c === ")" || c === "]" || c === ">") {
			--depth;
		}

		if (c === "," && depth === 0) {
			result.push(current.trim());
			current = "";
		} else {
			current += c;
		}
	}

	if (current.trim()) {
		result.push(current.trim());
	}

	return result;
}

/**
 * Flips the accesses to the 2D textures of the given code (see `flipTextureAccesses`), including the textures given
 * as parameters to the functions: the functions receive the flag of each of their texture parameters as an additional
 * parameter.
 * @param code defines the code to process (definitions and functions).
 * @param globalTextures defines the global textures that may be flipped, with the expression of their flag.
 * @param functions defines the functions having texture parameters, found in all the code of the stage.
 */
function flipShaderTextureAccesses(code: string, globalTextures: Map<string, string>, functions: Map<string, ITextureFunction>): string {
	// Calls to the functions with texture parameters: the flag of the texture argument is inserted after it.
	const addFlagArguments = (body: string, textures: Map<string, string>) =>
		!functions.size
			? body
			: rewriteCalls(body, Array.from(functions.keys()), (name, args) => {
					const textureFunction = functions.get(name)!;
					const result: string[] = [];

					args.forEach((arg, index) => {
						result.push(arg);
						if (textureFunction.textureParameters.includes(index)) {
							result.push(textures.get(arg) ?? "0.0");
						}
					});

					return `${name}(${result.join(", ")})`;
				});

	let result = "";
	let position = 0;

	const regex = /\bfn\s+(\w+)\s*\(/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(code))) {
		const openIndex = match.index + match[0].length - 1;
		const closeIndex = findClosingParenthesis(code, openIndex);
		const bodyOpen = code.indexOf("{", closeIndex);

		let depth = 0;
		let bodyClose = -1;
		for (let i = bodyOpen; i < code.length; ++i) {
			if (code[i] === "{") {
				++depth;
			} else if (code[i] === "}" && --depth === 0) {
				bodyClose = i;
				break;
			}
		}

		if (bodyOpen === -1 || bodyClose === -1) {
			break;
		}

		// Code between the functions (declarations, constants).
		result += flipTextureAccesses(addFlagArguments(code.slice(position, match.index), globalTextures), globalTextures);

		const textures = new Map(globalTextures);
		const parameters = splitParameters(code.slice(openIndex + 1, closeIndex)).map((parameter) => {
			const declaration = /^(\w+)\s*:\s*(.+)$/.exec(parameter);
			if (declaration && /^texture_2d</.test(declaration[2].replace(/\s+/g, ""))) {
				textures.set(declaration[1], getFlipUniform(declaration[1]));
				return `${parameter}, ${getFlipUniform(declaration[1])}: f32`;
			}

			return parameter;
		});

		const signature = `fn ${match[1]}(${parameters.join(", ")})${code.slice(closeIndex + 1, bodyOpen)}`;
		const body = flipTextureAccesses(addFlagArguments(code.slice(bodyOpen, bodyClose + 1), textures), textures);

		result += signature + body;
		position = bodyClose + 1;
		regex.lastIndex = position;
	}

	return result + flipTextureAccesses(addFlagArguments(code.slice(position), globalTextures), globalTextures);
}

/**
 * Returns the functions of the given code having 2D texture parameters.
 */
function findTextureFunctions(code: string): Map<string, ITextureFunction> {
	const functions = new Map<string, ITextureFunction>();

	const regex = /\bfn\s+(\w+)\s*\(/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(code))) {
		const openIndex = match.index + match[0].length - 1;
		const closeIndex = findClosingParenthesis(code, openIndex);

		const textureParameters: number[] = [];
		splitParameters(code.slice(openIndex + 1, closeIndex)).forEach((parameter, index) => {
			const declaration = /^(\w+)\s*:\s*(.+)$/.exec(parameter);
			if (declaration && /^texture_2d</.test(declaration[2].replace(/\s+/g, ""))) {
				textureParameters.push(index);
			}
		});

		if (textureParameters.length) {
			functions.set(match[1], { textureParameters });
		}
	}

	return functions;
}

const helpersWGSL = `
fn bjsFlipUV(uv: vec2<f32>, flip: f32) -> vec2<f32> {
	return vec2<f32>(uv.x, select(uv.y, 1.0 - uv.y, flip > 0.5));
}
fn bjsFlipVector(v: vec2<f32>, flip: f32) -> vec2<f32> {
	return vec2<f32>(v.x, select(v.y, -v.y, flip > 0.5));
}
fn bjsFlipTexel(texel: vec2<i32>, size: vec2<i32>, flip: f32) -> vec2<i32> {
	return vec2<i32>(texel.x, select(texel.y, size.y - 1 - texel.y, flip > 0.5));
}
`;

function getUniformInfo(type: string): { align: number; size: number; floats: number } {
	const array = /^array<(\w+(?:<\w+>)?),(\d+)>$/.exec(type);
	if (array) {
		const element = getUniformInfo(array[1]);
		const count = parseInt(array[2]);
		const stride = Math.ceil(element.size / 16) * 16;
		return { align: 16, size: stride * count, floats: (stride / 4) * count };
	}

	switch (type) {
		case "f32":
		case "i32":
		case "u32":
			return { align: 4, size: 4, floats: 1 };
		case "vec2f":
		case "vec2<f32>":
		case "vec2i":
		case "vec2<i32>":
			return { align: 8, size: 8, floats: 2 };
		case "vec3f":
		case "vec3<f32>":
			return { align: 16, size: 12, floats: 3 };
		case "vec4f":
		case "vec4<f32>":
		case "vec4i":
		case "vec4<i32>":
			return { align: 16, size: 16, floats: 4 };
		case "mat3x3f":
		case "mat3x3<f32>":
			return { align: 16, size: 48, floats: 12 };
		case "mat4x4f":
		case "mat4x4<f32>":
			return { align: 16, size: 64, floats: 16 };
		default:
			throw new Error(`Unsupported uniform type "${type}".`);
	}
}

function buildUniformLayout(uniforms: { name: string; type: string }[]): IWGSLUniformLayout {
	const fields = new Map<string, { type: string; offset: number; size: number }>();

	let offset = 0;
	uniforms.forEach((uniform) => {
		const info = getUniformInfo(uniform.type);

		offset = Math.ceil(offset / info.align) * info.align;
		fields.set(uniform.name, { type: uniform.type, offset: offset / 4, size: info.floats });

		offset += info.size;
	});

	return { fields, byteLength: Math.ceil(offset / 16) * 16 };
}

/**
 * Adapts the entry point of a stage written for Babylon.js: the body of its "main" function is moved to a function of
 * its own, reading and writing the private "vertexInputs"/"vertexOutputs" or "fragmentInputs"/"fragmentOutputs"
 * variables, as the code generated by Babylon.js does.
 */
function extractMainBody(code: string, stage: "vertex" | "fragment"): { definitions: string; main: string } {
	const match = new RegExp(`@${stage}\\s*fn\\s+main\\s*\\(([^)]*)\\)\\s*->\\s*\\w+\\s*\\{`).exec(code);
	if (!match) {
		throw new Error(`The ${stage} shader has no "main" entry point.`);
	}

	const openIndex = match.index + match[0].length - 1;

	let depth = 0;
	let closeIndex = -1;
	for (let i = openIndex; i < code.length; ++i) {
		if (code[i] === "{") {
			++depth;
		} else if (code[i] === "}" && --depth === 0) {
			closeIndex = i;
			break;
		}
	}

	if (closeIndex < 0) {
		throw new Error(`The "main" function of the ${stage} shader is not closed.`);
	}

	// The outputs are private variables: the "main" function of Babylon.js may return them early.
	const outputs = stage === "vertex" ? "vertexOutputs" : "fragmentOutputs";

	return {
		definitions: code.slice(0, match.index) + code.slice(closeIndex + 1),
		main: code.slice(openIndex + 1, closeIndex).replace(new RegExp(`\\breturn\\s+${outputs}\\s*;`, "g"), "return;"),
	};
}

/**
 * Builds a post-process shader from the sources of a Babylon.js shader. The defines are processed the same way
 * Babylon.js processes them with WebGPU (the depth of the clip space ranges from 0 to 1).
 * @param source defines the sources of the shader.
 * @param options defines the defines and the index parameters used to build the shader.
 * @returns the shader, ready to create its render pipeline.
 */
export function buildPostProcessShader(source: IPostProcessShaderSource, options: IPostProcessShaderOptions = {}): IPostProcessShader {
	const defines: WGSLDefines = { IS_NDC_HALF_ZRANGE: true, ...options.defines };

	const preprocess = (code: string) => preprocessWGSL(expandPostProcessShaderIncludes(code, options.indexParameters), defines);

	const vertex = parseDeclarations(preprocess(source.vertex ?? postProcessVertexWGSL));
	const fragment = parseDeclarations(preprocess(source.fragment));

	// Uniforms (shared by both stages, as the uniform buffer of the effects of Babylon.js), then the internal fields.
	const uniforms: { name: string; type: string }[] = [];
	[...vertex.uniforms, ...fragment.uniforms].forEach((uniform) => {
		if (!uniforms.some((u) => u.name === uniform.name)) {
			uniforms.push(uniform);
		}
	});
	// Internal fields: the orientation of the textures and of the target (see "bjsYFactor").
	fragment.textures.forEach((texture) => {
		if (texture.type.startsWith("texture_2d") && !texture.type.startsWith("texture_2d_array") && !(options.unflippedTextures ?? []).includes(texture.name)) {
			uniforms.push({ name: getFlipUniform(texture.name), type: "f32" });
		}
	});
	uniforms.push({ name: "bjsYFactor", type: "f32" });
	uniforms.push({ name: "bjsTargetSize", type: "vec4<f32>" });

	const layout = buildUniformLayout(uniforms);

	// Textures and samplers (the textures of the vertex stage are not supported: none of the ported shaders uses them).
	const bindings: IPostProcessShaderBinding[] = [{ name: "uniforms", binding: 0, kind: "uniform" }];
	const declarations: string[] = [];

	const textures = fragment.textures;
	const samplers = fragment.samplers;
	const unflipped = new Set(options.unflippedTextures ?? []);
	const flipped = new Set<string>();

	textures.forEach((texture) => {
		const sampler = samplers.find((s) => s.name === `${texture.name}Sampler`);

		let viewDimension: GPUTextureViewDimension = "2d";
		if (texture.type.includes("2d_array")) {
			viewDimension = "2d-array";
		} else if (texture.type.includes("cube")) {
			viewDimension = "cube";
		} else if (texture.type.includes("3d")) {
			viewDimension = "3d";
		}

		if (viewDimension === "2d" && !texture.type.startsWith("texture_2d_array") && !unflipped.has(texture.name)) {
			flipped.add(texture.name);
		}

		const sampleType: GPUTextureSampleType = texture.type.startsWith("texture_depth") ? "depth" : sampler ? "float" : "unfilterable-float";

		bindings.push({ name: texture.name, binding: bindings.length, kind: "texture", viewDimension, sampleType });
		declarations.push(`@group(0) @binding(${bindings.length - 1}) var ${texture.name}: ${texture.type};`);
	});

	samplers.forEach((sampler) => {
		const texture = sampler.name.replace(/Sampler$/, "");
		if (!textures.some((t) => t.name === texture)) {
			throw new Error(`The sampler "${sampler.name}" of the shader "${source.name}" has no texture named "${texture}".`);
		}

		const samplerType: GPUSamplerBindingType = sampler.type === "sampler_comparison" ? "comparison" : "filtering";

		bindings.push({ name: sampler.name, binding: bindings.length, kind: "sampler", texture, samplerType });
		declarations.push(`@group(0) @binding(${bindings.length - 1}) var ${sampler.name}: ${sampler.type};`);
	});

	// Varyings: written by the vertex stage, read by the fragment stage.
	const varyings = vertex.varyings.slice();
	fragment.varyings.forEach((varying) => {
		if (!varyings.some((v) => v.name === varying.name)) {
			varyings.push(varying);
		}
	});

	const vertexMain = extractMainBody(vertex.body, "vertex");
	const fragmentMain = extractMainBody(fragment.body, "fragment");

	// Outputs of the fragment stage.
	const outputNames = Array.from(new Set(Array.from(fragmentMain.main.matchAll(/fragmentOutputs\.(\w+)/g)).map((match) => match[1]))).filter(
		(name) => name === "color" || /^fragData\d+$/.test(name)
	);

	const outputs = ["color", ...outputNames.filter((name) => name !== "color").sort()];
	const writesDepth = /fragmentOutputs\.fragDepth/.test(fragmentMain.main);

	const uniformsWGSL = `
struct EffectUniforms {
${uniforms.map((uniform) => `\t${uniform.name}: ${uniform.type},`).join("\n")}
};
@group(0) @binding(0) var<uniform> uniforms: EffectUniforms;
`;

	const fragmentInputsWGSL = `
struct FragmentInputs {
	@builtin(position) position: vec4<f32>,
${varyings.map((varying, index) => `\t@location(${index}) ${varying.name}: ${varying.type},`).join("\n")}
};
`;

	// The stages are compiled as two modules, as Babylon.js does: their definitions may use the same names.
	const vertexCode = `
${uniformsWGSL}
${fragmentInputsWGSL}

struct VertexInputs {
${vertex.attributes.map((attribute) => `\t${attribute.name}: ${attribute.type},`).join("\n") || "\tposition: vec2<f32>,"}
};

var<private> vertexInputs: VertexInputs;
var<private> vertexOutputs: FragmentInputs;

${vertexMain.definitions}

fn bjsVertexMain(input: VertexInputs) {
${vertexMain.main}
}

@vertex
fn bjsVertex(@builtin(vertex_index) vertexIndex: u32) -> FragmentInputs {
	// Same quad as the post-processes of Babylon.js (vertices (1, 1), (-1, 1), (-1, -1), (1, -1) and indices 0, 1, 2, 0,
	// 2, 3): the varyings are interpolated exactly the same way, which matters to the shaders hashing their coordinates.
	var positions = array<vec2<f32>, 6>(vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0));
	vertexInputs.position = positions[vertexIndex];
	bjsVertexMain(vertexInputs);

	// Same as Babylon.js: the render targets are drawn upside down (their first row is the bottom of the image).
	vertexOutputs.position.y = vertexOutputs.position.y * uniforms.bjsYFactor;
	return vertexOutputs;
}
`;

	// The global textures that may be flipped, and the functions receiving textures as parameters.
	const flippedTextures = new Map(Array.from(flipped).map((texture) => [texture, `uniforms.${getFlipUniform(texture)}`]));
	const textureFunctions = findTextureFunctions(fragmentMain.definitions);

	const fragmentCode = `
${uniformsWGSL}
${declarations.join("\n")}
${fragmentInputsWGSL}

struct FragmentOutputs {
${outputs.map((output) => `\t${output}: vec4<f32>,`).join("\n")}
${writesDepth ? "\tfragDepth: f32," : ""}
};

struct BjsFragmentOutputs {
${outputs.map((output, index) => `\t@location(${index}) ${output}: vec4<f32>,`).join("\n")}
${writesDepth ? "\t@builtin(frag_depth) fragDepth: f32," : ""}
};

var<private> fragmentInputs: FragmentInputs;
var<private> fragmentOutputs: FragmentOutputs;

${helpersWGSL}

${flipShaderTextureAccesses(fragmentMain.definitions, flippedTextures, textureFunctions)}

fn bjsFragmentMain(input: FragmentInputs) {
${flipShaderTextureAccesses(fragmentMain.main, flippedTextures, textureFunctions)}
}

@fragment
fn bjsFragment(raw: FragmentInputs) -> BjsFragmentOutputs {
	// Same as Babylon.js: the origin of "fragmentInputs.position" is the bottom-left corner of the target (the render
	// targets are drawn upside down, the canvas is not).
	var inputs = raw;
	if (uniforms.bjsYFactor == 1.0) {
		inputs.position.y = uniforms.bjsTargetSize.y - raw.position.y;
	}
	fragmentInputs = inputs;
	bjsFragmentMain(inputs);

	var result: BjsFragmentOutputs;
${outputs.map((output) => `\tresult.${output} = fragmentOutputs.${output};`).join("\n")}
${writesDepth ? "\tresult.fragDepth = fragmentOutputs.fragDepth;" : ""}
	return result;
}
`;

	return { name: source.name, vertexCode, fragmentCode, bindings, uniforms: layout, outputCount: outputs.length };
}
