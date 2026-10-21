import { EffectBindingLayout } from "@babylonjs/lite";

/**
 * Defines the values of the defines used to preprocess a WGSL source. A define set to false, null or undefined is not
 * defined, a define set to true is defined without value.
 */
export type WGSLDefines = Record<string, string | number | boolean | null | undefined>;

interface IConditionalBlock {
	parentActive: boolean;
	taken: boolean;
}

/**
 * Processes the preprocessor directives of the given WGSL source the same way the shader processor of Babylon.js does:
 * "#define", "#undef", "#ifdef", "#ifndef", "#if", "#elif", "#else" and "#endif". The conditions support the
 * "defined(NAME)" operator, the comparison operators, "&&", "||", "!" and parentheses: an identifier that is not
 * defined evaluates to 0. The identifiers of the defines that have a value are replaced by their value in the code.
 * @param source defines the WGSL source to process.
 * @param defines defines the values of the defines.
 * @returns the processed WGSL source.
 */
export function preprocessWGSL(source: string, defines: WGSLDefines): string {
	const values = new Map<string, string>();

	Object.keys(defines).forEach((name) => {
		const value = defines[name];
		if (value !== false && value !== null && value !== undefined) {
			values.set(name, value === true ? "" : String(value));
		}
	});

	const output: string[] = [];
	const stack: IConditionalBlock[] = [];

	let active = true;

	source.split("\n").forEach((line, index) => {
		const directive = /^\s*#\s*(\w+)\s*(.*?)\s*$/.exec(line);
		if (!directive) {
			if (active) {
				output.push(line);
			}
			return;
		}

		const keyword = directive[1];
		const argument = directive[2];

		switch (keyword) {
			case "define": {
				const definition = /^(\w+)\s*(.*)$/.exec(argument);
				if (active && definition) {
					values.set(definition[1], definition[2]);
				}
				break;
			}

			case "undef":
				if (active) {
					values.delete(argument);
				}
				break;

			case "ifdef":
			case "ifndef":
			case "if": {
				let condition = false;
				if (active) {
					condition = keyword === "ifdef" ? values.has(argument) : keyword === "ifndef" ? !values.has(argument) : evaluateCondition(argument, values);
				}

				stack.push({ parentActive: active, taken: condition });
				active = condition;
				break;
			}

			case "elif": {
				const block = getCurrentBlock(stack, keyword, index);
				const condition = block.parentActive && !block.taken && evaluateCondition(argument, values);

				block.taken ||= condition;
				active = condition;
				break;
			}

			case "else": {
				const block = getCurrentBlock(stack, keyword, index);

				active = block.parentActive && !block.taken;
				block.taken = true;
				break;
			}

			case "endif":
				active = getCurrentBlock(stack, keyword, index).parentActive;
				stack.pop();
				break;

			default:
				throw new Error(`Unknown preprocessor directive "#${keyword}" at line ${index + 1}.`);
		}
	});

	if (stack.length) {
		throw new Error(`Missing "#endif" in the WGSL source.`);
	}

	const names = Array.from(values.keys())
		.filter((name) => values.get(name) !== "")
		.sort((a, b) => b.length - a.length);

	if (!names.length) {
		return output.join("\n");
	}

	const regex = new RegExp(`\\b(${names.join("|")})\\b`, "g");
	return output.map((line) => line.replace(regex, (name) => values.get(name)!)).join("\n");
}

function getCurrentBlock(stack: IConditionalBlock[], keyword: string, index: number): IConditionalBlock {
	const block = stack[stack.length - 1];
	if (!block) {
		throw new Error(`Unexpected "#${keyword}" at line ${index + 1}.`);
	}

	return block;
}

/**
 * Evaluates the condition of a "#if" or "#elif" directive.
 */
function evaluateCondition(expression: string, values: Map<string, string>): boolean {
	const tokens = expression.replace(/defined\s*\(\s*(\w+)\s*\)/g, (_, name: string) => (values.has(name) ? "1" : "0")).match(/\d+(\.\d+)?|\w+|&&|\|\||==|!=|<=|>=|[<>!()]/g);

	if (!tokens) {
		throw new Error(`Invalid preprocessor condition "${expression}".`);
	}

	let position = 0;

	const peek = () => tokens[position];
	const next = () => tokens[position++];

	// Recursive descent parser, by increasing precedence: "||", "&&", the comparisons and the unary operators.
	function parseOr(): number {
		let left = parseAnd();
		while (peek() === "||") {
			next();
			const right = parseAnd();
			left = left || right ? 1 : 0;
		}

		return left;
	}

	function parseAnd(): number {
		let left = parseComparison();
		while (peek() === "&&") {
			next();
			const right = parseComparison();
			left = left && right ? 1 : 0;
		}

		return left;
	}

	function parseComparison(): number {
		let left = parsePrimary();

		while (["<", ">", "<=", ">=", "==", "!="].includes(peek())) {
			const operator = next();
			const right = parsePrimary();

			switch (operator) {
				case "<":
					left = left < right ? 1 : 0;
					break;
				case ">":
					left = left > right ? 1 : 0;
					break;
				case "<=":
					left = left <= right ? 1 : 0;
					break;
				case ">=":
					left = left >= right ? 1 : 0;
					break;
				case "==":
					left = left === right ? 1 : 0;
					break;
				default:
					left = left !== right ? 1 : 0;
					break;
			}
		}

		return left;
	}

	function parsePrimary(): number {
		const token = next();

		if (token === "(") {
			const value = parseOr();
			if (next() !== ")") {
				throw new Error(`Missing ")" in the preprocessor condition "${expression}".`);
			}
			return value;
		}

		if (token === "!") {
			return parsePrimary() ? 0 : 1;
		}

		if (token === undefined) {
			throw new Error(`Unexpected end of the preprocessor condition "${expression}".`);
		}

		if (/^\d/.test(token)) {
			return parseFloat(token);
		}

		// Same as C: an identifier that is not defined evaluates to 0, a define without value to 1.
		if (!values.has(token)) {
			return 0;
		}

		const value = values.get(token)!;
		return value === "" ? 1 : parseFloat(value) || 0;
	}

	const result = parseOr();
	if (position !== tokens.length) {
		throw new Error(`Invalid preprocessor condition "${expression}".`);
	}

	return result !== 0;
}

/**
 * Defines a field of the uniform buffer of an effect.
 */
export interface IWGSLUniformField {
	/**
	 * Defines the WGSL type of the field.
	 */
	type: string;
	/**
	 * Defines the offset of the field in the uniform buffer, in floats.
	 */
	offset: number;
	/**
	 * Defines the number of floats the field holds (without the padding of the arrays elements).
	 */
	size: number;
}

/**
 * Defines the layout of the uniform buffer of an effect.
 */
export interface IWGSLUniformLayout {
	/**
	 * Defines the fields of the uniform buffer, keyed by their name.
	 */
	fields: Map<string, IWGSLUniformField>;
	/**
	 * Defines the size of the uniform buffer in bytes.
	 */
	byteLength: number;
}

/**
 * Defines an effect built from a WGSL source written with the declarations of the Babylon.js shaders.
 */
export interface IWGSLEffectShader {
	/**
	 * Defines the WGSL source of the fragment stage, with its bindings declared in the group 0.
	 */
	fragmentWGSL: string;
	/**
	 * Defines the bindings to create the effect wrapper with.
	 */
	bindings: EffectBindingLayout[];
	/**
	 * Defines the layout of the uniform buffer, bound to "uniforms" (null when the shader declares no uniform).
	 */
	uniforms: IWGSLUniformLayout | null;
}

function getUniformTypeInfo(type: string): { align: number; size: number; floats: number } {
	const array = /^array<\s*(\w+)\s*,\s*(\d+)\s*>$/.exec(type);
	if (array) {
		const element = getUniformTypeInfo(array[1]);
		const count = parseInt(array[2]);

		// The elements of the arrays of the uniform buffers are aligned on 16 bytes.
		const stride = Math.ceil(element.size / 16) * 16;
		return { align: Math.max(16, element.align), size: stride * count, floats: (stride / 4) * count };
	}

	switch (type) {
		case "f32":
		case "i32":
		case "u32":
			return { align: 4, size: 4, floats: 1 };
		case "vec2f":
		case "vec2<f32>":
			return { align: 8, size: 8, floats: 2 };
		case "vec3f":
		case "vec3<f32>":
			return { align: 16, size: 12, floats: 3 };
		case "vec4f":
		case "vec4<f32>":
			return { align: 16, size: 16, floats: 4 };
		case "mat4x4f":
		case "mat4x4<f32>":
			return { align: 16, size: 64, floats: 16 };
		default:
			throw new Error(`Unsupported uniform type "${type}".`);
	}
}

/**
 * Builds the fragment stage of an effect from the given preprocessed WGSL source written with the declarations of the
 * Babylon.js shaders, so the shaders of the Babylon.js version of the tools can be ported almost as is:
 * - "uniform name: type;" declares a field of the uniform buffer, read using "uniforms.name",
 * - "var name: texture_xxx;" declares a texture and "var nameSampler: sampler;" (or "sampler_comparison") declares the
 *   sampler of the texture "name". A texture without sampler is read using "textureLoad" only (unfilterable).
 * @param source defines the preprocessed WGSL source (see `preprocessWGSL`).
 * @returns the fragment stage, its bindings and the layout of its uniform buffer.
 */
export function buildWGSLEffectShader(source: string): IWGSLEffectShader {
	const uniforms: { name: string; type: string }[] = [];
	const resources: { name: string; type: string }[] = [];

	const body = source
		.split("\n")
		.filter((line) => {
			const uniform = /^\s*uniform\s+(\w+)\s*:\s*([^;]+);\s*$/.exec(line);
			if (uniform) {
				uniforms.push({ name: uniform[1], type: uniform[2].replace(/\s+/g, "") });
				return false;
			}

			const resource = /^\s*var\s+(\w+)\s*:\s*((?:texture|sampler)[^;]*);\s*$/.exec(line);
			if (resource) {
				resources.push({ name: resource[1], type: resource[2].replace(/\s+/g, "") });
				return false;
			}

			return true;
		})
		.join("\n");

	const bindings: EffectBindingLayout[] = [];
	const declarations: string[] = [];

	let uniformLayout: IWGSLUniformLayout | null = null;

	if (uniforms.length) {
		const fields = new Map<string, IWGSLUniformField>();

		let offset = 0;
		let maxAlign = 16;

		uniforms.forEach((uniform) => {
			const info = getUniformTypeInfo(uniform.type);

			offset = Math.ceil(offset / info.align) * info.align;
			fields.set(uniform.name, { type: uniform.type, offset: offset / 4, size: info.floats });

			offset += info.size;
			maxAlign = Math.max(maxAlign, info.align);
		});

		uniformLayout = {
			fields,
			byteLength: Math.ceil(offset / maxAlign) * maxAlign,
		};

		declarations.push(`struct EffectUniforms {\n${uniforms.map((uniform) => `\t${uniform.name}: ${uniform.type},`).join("\n")}\n};`);
		declarations.push(`@group(0) @binding(0) var<uniform> uniforms: EffectUniforms;`);

		bindings.push({ name: "uniforms", binding: 0, kind: "uniform", uniformByteLength: uniformLayout.byteLength });
	}

	const textures = resources.filter((resource) => resource.type.startsWith("texture"));
	const samplers = resources.filter((resource) => resource.type.startsWith("sampler"));

	textures.forEach((texture) => {
		const binding = bindings.length;
		const sampler = samplers.find((s) => s.name === `${texture.name}Sampler`);

		let textureSampleType: GPUTextureSampleType = sampler ? "float" : "unfilterable-float";
		if (texture.type.startsWith("texture_depth")) {
			textureSampleType = "depth";
		}

		let viewDimension: GPUTextureViewDimension = "2d";
		if (texture.type.includes("2d_array")) {
			viewDimension = "2d-array";
		} else if (texture.type.includes("cube")) {
			viewDimension = "cube";
		} else if (texture.type.includes("3d")) {
			viewDimension = "3d";
		}

		bindings.push({ name: texture.name, binding, kind: "texture", textureSampleType, viewDimension });
		declarations.push(`@group(0) @binding(${binding}) var ${texture.name}: ${texture.type};`);
	});

	samplers.forEach((sampler) => {
		const textureName = sampler.name.replace(/Sampler$/, "");
		if (!textures.some((texture) => texture.name === textureName)) {
			throw new Error(`The sampler "${sampler.name}" has no texture named "${textureName}".`);
		}

		const binding = bindings.length;
		const samplerType: GPUSamplerBindingType = sampler.type === "sampler_comparison" ? "comparison" : "filtering";

		bindings.push({ name: sampler.name, binding, kind: "sampler", samplerType, textureBinding: textureName });
		declarations.push(`@group(0) @binding(${binding}) var ${sampler.name}: ${sampler.type};`);
	});

	return {
		fragmentWGSL: `${declarations.join("\n")}\n${body}`,
		bindings,
		uniforms: uniformLayout,
	};
}

/**
 * Writes the values of the uniforms of an effect in a buffer laid out as described by an `IWGSLUniformLayout`.
 */
export class WGSLUniformWriter {
	/**
	 * Defines the buffer the values are written to.
	 */
	public readonly data: Float32Array;

	private _layout: IWGSLUniformLayout;

	/**
	 * Constructor.
	 * @param layout defines the layout of the uniform buffer.
	 */
	public constructor(layout: IWGSLUniformLayout) {
		this._layout = layout;
		this.data = new Float32Array(layout.byteLength / 4);
	}

	/**
	 * Returns wether or not the uniform buffer has a field with the given name.
	 * @param name defines the name of the field.
	 */
	public has(name: string): boolean {
		return this._layout.fields.has(name);
	}

	/**
	 * Sets the value of the given field. Does nothing if the uniform buffer has no field with the given name (optimized
	 * away by the defines of the shader).
	 * @param name defines the name of the field.
	 * @param values defines the values to write (floats of the field, in order).
	 */
	public set(name: string, ...values: number[]): void {
		const field = this._layout.fields.get(name);
		if (field) {
			for (let i = 0, length = Math.min(values.length, field.size); i < length; ++i) {
				this.data[field.offset + i] = values[i];
			}
		}
	}

	/**
	 * Sets the values of the given field from an array of floats. The elements of the arrays of "vec4f" and "mat4x4f" are
	 * written contiguously, as they are laid out in the uniform buffer.
	 * @param name defines the name of the field.
	 * @param values defines the values to write.
	 */
	public setArray(name: string, values: ArrayLike<number>): void {
		const field = this._layout.fields.get(name);
		if (field) {
			const length = Math.min(values.length, field.size);
			for (let i = 0; i < length; ++i) {
				this.data[field.offset + i] = values[i];
			}
		}
	}
}
