import { EngineContext } from "@babylonjs/lite";

import { WGSLUniformWriter } from "../wgsl";

import { buildPostProcessShader, IPostProcessShader, IPostProcessShaderOptions, IPostProcessShaderSource } from "./shader";

/**
 * Defines the sampling modes of the textures read by the post-processes, same as the sampling modes of Babylon.js:
 * "nearest" (`NEAREST_SAMPLINGMODE`), "bilinear" (`BILINEAR_SAMPLINGMODE`) and "trilinear" (`TRILINEAR_SAMPLINGMODE`).
 */
export type PostProcessSamplingMode = "nearest" | "bilinear" | "trilinear";

/**
 * Defines the addressing modes of the textures read by the post-processes, same as the addressing modes of Babylon.js.
 */
export type PostProcessAddressMode = "clamp" | "wrap" | "mirror";

/**
 * Defines a texture read by a post-process pass.
 */
export interface IPostProcessTexture {
	readonly view: GPUTextureView;
	readonly width: number;
	readonly height: number;
	readonly format: GPUTextureFormat;
	/**
	 * Defines wether or not the first row of the texture is the top of the image, as the textures of Babylon Lite. The
	 * textures drawn by the passes store their first row at the bottom, as the render targets of Babylon.js.
	 */
	readonly topDown?: boolean;
}

/**
 * Defines a target a post-process pass draws into.
 */
export interface IPostProcessTarget {
	readonly view: GPUTextureView;
	readonly width: number;
	readonly height: number;
	readonly format: GPUTextureFormat;
	/**
	 * Defines wether or not the pass draws the first row of the target at the top of the image: true for the canvas,
	 * false for the render targets (drawn upside down, as Babylon.js does).
	 */
	readonly topDown?: boolean;
}

/**
 * Defines the options used to bind a texture to a post-process pass.
 */
export interface IPostProcessTextureBinding {
	texture: IPostProcessTexture;
	/**
	 * Defines the sampling mode of the texture (bilinear by default, as the post-processes of Babylon.js).
	 */
	samplingMode?: PostProcessSamplingMode;
	/**
	 * Defines the addressing mode of the texture (clamp by default, as the render targets of Babylon.js).
	 */
	addressMode?: PostProcessAddressMode;
}

/**
 * Defines the options used to draw a post-process pass.
 */
export interface IPostProcessDrawOptions {
	/**
	 * Defines the color to clear the target with before drawing. The target is loaded when not set.
	 */
	clearColor?: GPUColorDict | null;
	/**
	 * Defines the blending state of the pass.
	 */
	blend?: GPUBlendState;
	/**
	 * Defines the additional targets of the passes writing several outputs (MRT).
	 */
	additionalTargets?: IPostProcessTarget[];
}

interface IEngineInternals {
	_device: GPUDevice;
	_currentEncoder: GPUCommandEncoder | null;
}

/**
 * Returns the GPU device of the given engine of Babylon Lite.
 * @internal
 */
export function _getDevice(engine: EngineContext): GPUDevice {
	return (engine as unknown as IEngineInternals)._device;
}

/**
 * Returns the command encoder of the frame being rendered by the given engine of Babylon Lite: the frame graph tasks
 * record their passes in it.
 * @internal
 */
export function _getCurrentEncoder(engine: EngineContext): GPUCommandEncoder | null {
	return (engine as unknown as IEngineInternals)._currentEncoder;
}

const samplersCache = new WeakMap<GPUDevice, GPUSampler[]>();
const samplingModes: PostProcessSamplingMode[] = ["nearest", "bilinear", "trilinear"];
const addressModes: PostProcessAddressMode[] = ["clamp", "wrap", "mirror"];

/**
 * Returns the sampler of the given device for the given sampling and addressing modes (same filters as the samplers
 * Babylon.js creates with WebGPU for these modes).
 * @internal
 */
export function _getPostProcessSampler(device: GPUDevice, samplingMode: PostProcessSamplingMode, addressMode: PostProcessAddressMode, filterable: boolean): GPUSampler {
	let cache = samplersCache.get(device);
	if (!cache) {
		cache = [];
		samplersCache.set(device, cache);
	}

	const mode = filterable ? samplingMode : "nearest";
	const index = samplingModes.indexOf(mode) * addressModes.length + addressModes.indexOf(addressMode);

	let sampler = cache[index];
	if (!sampler) {
		const filter: GPUFilterMode = mode === "nearest" ? "nearest" : "linear";
		const address: GPUAddressMode = addressMode === "wrap" ? "repeat" : addressMode === "mirror" ? "mirror-repeat" : "clamp-to-edge";

		sampler = device.createSampler({
			label: `editor-post-process-sampler-${mode}|${addressMode}`,
			magFilter: filter,
			minFilter: filter,
			mipmapFilter: mode === "trilinear" ? "linear" : "nearest",
			addressModeU: address,
			addressModeV: address,
			addressModeW: address,
		});

		cache[index] = sampler;
	}

	return sampler;
}

/**
 * Returns wether or not the given texture format is filtered when sampled. Same as Babylon.js with WebGPU, which
 * doesn't request the "float32-filterable" feature by default: the 32 bits float textures are sampled without filtering.
 */
const filterableFormats = new Map<GPUTextureFormat, boolean>();

function isFilterableFormat(device: GPUDevice, format: GPUTextureFormat): boolean {
	void device;

	let filterable = filterableFormats.get(format);
	if (filterable === undefined) {
		filterable = format !== "r32float" && format !== "rg32float" && format !== "rgba32float" && !format.startsWith("depth") && !/(sint|uint)$/.test(format);
		filterableFormats.set(format, filterable);
	}

	return filterable;
}

const pipelinesCache = new WeakMap<GPUDevice, Map<string, GPURenderPipeline>>();
const modulesCache = new WeakMap<GPUDevice, Map<string, GPUShaderModule>>();

/**
 * Identifiers of the shaders of the passes (vertex and fragment code): the render pipelines are shared by the passes
 * drawing the same shader, cached by a small key.
 */
const shaderIds = new Map<string, number>();

function getShaderId(shader: IPostProcessShader): number {
	const code = `${shader.vertexCode}\0${shader.fragmentCode}`;

	let id = shaderIds.get(code);
	if (id === undefined) {
		id = shaderIds.size;
		shaderIds.set(code, id);
	}

	return id;
}

/**
 * Defines a texture bound to a pass, with the name of the uniform telling the shader its orientation.
 */
interface IPassTextureBinding extends IPostProcessTextureBinding {
	flipUniform: string;
}

/**
 * Defines the render pipeline drawn the last time by a pass, reused while the targets and the blending don't change.
 */
interface ILastPipeline {
	pipeline: GPURenderPipeline;
	layout: GPUBindGroupLayout;
	formats: GPUTextureFormat[];
	blend: GPUBlendState | undefined;
}

const noDrawOptions: IPostProcessDrawOptions = {};

/**
 * Defines the number of bind groups kept by a pass for the textures it read the last frames.
 */
const maxCachedBindGroups = 4;

/**
 * Returns the shader module of the given device for the given code, compiled once.
 */
function getShaderModule(device: GPUDevice, label: string, code: string): GPUShaderModule {
	let cache = modulesCache.get(device);
	if (!cache) {
		cache = new Map();
		modulesCache.set(device, cache);
	}

	let module = cache.get(code);
	if (!module) {
		module = device.createShaderModule({ label, code });
		cache.set(code, module);
	}

	return module;
}

/**
 * Defines a pass of a post-process: a fullscreen draw of a shader ported from Babylon.js, with its own uniform buffer
 * and textures. A pass is drawn at most once per frame: the uniform buffer written by the queue before the frame is
 * submitted is read by all the draws of the frame.
 */
export class PostProcessPass {
	/**
	 * Defines the shader drawn by the pass.
	 */
	public readonly shader: IPostProcessShader;
	/**
	 * Defines the values of the uniforms of the pass, uploaded when the pass is drawn (when they changed).
	 */
	public readonly uniforms: WGSLUniformWriter;

	private _device: GPUDevice;
	private _engine: EngineContext;
	private _uniformBuffer: GPUBuffer;
	private _uploadedUniforms: Uint32Array | null = null;
	private _textures: Map<string, IPassTextureBinding> = new Map();

	private _bindGroup: GPUBindGroup | null = null;
	private _boundResources: unknown[] = [];
	private _bindGroupsCache: { layout: GPUBindGroupLayout; resources: unknown[]; group: GPUBindGroup }[] = [];
	private _layoutDirty: boolean = true;
	private _layoutKey: string = "";
	private _bindGroupLayout: GPUBindGroupLayout | null = null;
	private _pipelineLayout: GPUPipelineLayout | null = null;
	private _modules: { vertex: GPUShaderModule; fragment: GPUShaderModule } | null = null;

	private _shaderId: number;
	private _pipelines: Map<string, GPURenderPipeline> = new Map();
	private _lastPipeline: ILastPipeline | null = null;
	private _formats: GPUTextureFormat[] = [];

	private _colorAttachments: GPURenderPassColorAttachment[] = [];

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 * @param source defines the sources of the shader, written for Babylon.js.
	 * @param options defines the defines and the index parameters used to build the shader.
	 */
	public constructor(engine: EngineContext, source: IPostProcessShaderSource | IPostProcessShader, options?: IPostProcessShaderOptions) {
		this._engine = engine;
		this._device = _getDevice(engine);

		this.shader = "vertexCode" in source ? source : buildPostProcessShader(source, options);
		this.uniforms = new WGSLUniformWriter(this.shader.uniforms);
		this._shaderId = getShaderId(this.shader);

		// Default values of the uniforms of the vertex shaders of Babylon.js.
		this.uniforms.set("scale", 1, 1);

		this._uniformBuffer = this._device.createBuffer({
			label: `${this.shader.name}-uniforms`,
			size: Math.max(16, this.shader.uniforms.byteLength),
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	/**
	 * Binds the given texture to the given texture of the shader.
	 * @param name defines the name of the texture in the shader.
	 * @param texture defines the texture to bind.
	 * @param samplingMode defines the sampling mode of the texture (bilinear by default).
	 * @param addressMode defines the addressing mode of the texture (clamp by default).
	 */
	public setTexture(name: string, texture: IPostProcessTexture, samplingMode: PostProcessSamplingMode = "bilinear", addressMode: PostProcessAddressMode = "clamp"): void {
		const bound = this._textures.get(name);
		if (!bound) {
			this._textures.set(name, { texture, samplingMode, addressMode, flipUniform: `bjsFlip_${name}` });
			this._layoutDirty = true;
			return;
		}

		// The layout of the bindings depends on the filterability of the formats of the textures.
		if (isFilterableFormat(this._device, bound.texture.format) !== isFilterableFormat(this._device, texture.format)) {
			this._layoutDirty = true;
		}

		bound.texture = texture;
		bound.samplingMode = samplingMode;
		bound.addressMode = addressMode;
	}

	/**
	 * Returns wether or not the shader of the pass reads the given texture.
	 * @param name defines the name of the texture in the shader.
	 */
	public hasTexture(name: string): boolean {
		return this.shader.bindings.some((binding) => binding.kind === "texture" && binding.name === name);
	}

	/**
	 * Draws the pass into the given target, using the command encoder of the current frame.
	 * @param target defines the target to draw into.
	 * @param options defines the options of the draw (clear color, blending).
	 * @returns the number of draw calls (0 when the command encoder or a texture is missing).
	 */
	public draw(target: IPostProcessTarget, options: IPostProcessDrawOptions = noDrawOptions): number {
		const encoder = _getCurrentEncoder(this._engine);
		if (!encoder) {
			return 0;
		}

		const uniforms = this.uniforms;
		uniforms.set("bjsTargetSize", target.width, target.height, 1 / target.width, 1 / target.height);
		uniforms.set("bjsYFactor", target.topDown ? 1 : -1);
		this._textures.forEach((bound) => uniforms.set(bound.flipUniform, bound.texture.topDown ? 1 : 0));

		this._uploadUniforms();

		const bindGroup = this._getBindGroup();
		if (!bindGroup) {
			return 0;
		}

		const additionalTargets = options.additionalTargets;
		const formats = this._formats;
		formats.length = 1 + (additionalTargets?.length ?? 0);
		formats[0] = target.format;
		additionalTargets?.forEach((t, index) => (formats[index + 1] = t.format));

		const pipeline = this._getPipeline(formats, options.blend);

		this._colorAttachments.length = formats.length;
		for (let index = 0; index < formats.length; ++index) {
			const t = index === 0 ? target : additionalTargets![index - 1];
			this._colorAttachments[index] = {
				view: t.view,
				loadOp: options.clearColor ? "clear" : "load",
				storeOp: "store",
				clearValue: options.clearColor ?? undefined,
			};
		}

		const pass = encoder.beginRenderPass({ label: this.shader.name, colorAttachments: this._colorAttachments });
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(6);
		pass.end();

		return 1;
	}

	/**
	 * Disposes the resources of the pass.
	 */
	public dispose(): void {
		this._uniformBuffer.destroy();
		this._textures.clear();
		this._bindGroup = null;
		this._boundResources = [];
		this._bindGroupsCache = [];
		this._pipelines.clear();
		this._lastPipeline = null;
	}

	/**
	 * Uploads the values of the uniforms when they changed since the last time the pass has been drawn (the buffer is
	 * only written by the pass).
	 */
	private _uploadUniforms(): void {
		const data = this.uniforms.data;
		const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);

		const uploaded = this._uploadedUniforms;
		if (uploaded) {
			let index = 0;
			while (index < bits.length && bits[index] === uploaded[index]) {
				++index;
			}

			if (index === bits.length) {
				return;
			}

			uploaded.set(bits);
		} else {
			this._uploadedUniforms = new Uint32Array(bits);
		}

		this._device.queue.writeBuffer(this._uniformBuffer, 0, data);
	}

	/**
	 * Returns the key describing the sample types of the textures bound to the pass: the layout of the bindings depends
	 * on the filterability of their formats.
	 */
	private _getLayoutKey(): string {
		return this.shader.bindings
			.filter((binding) => binding.kind === "texture")
			.map((binding) => {
				const bound = this._textures.get(binding.name);
				return bound && binding.sampleType === "float" && !isFilterableFormat(this._device, bound.texture.format) ? "u" : "f";
			})
			.join("");
	}

	private _getBindGroupLayout(): GPUBindGroupLayout {
		if (this._bindGroupLayout && !this._layoutDirty) {
			return this._bindGroupLayout;
		}

		this._layoutDirty = false;

		const layoutKey = this._getLayoutKey();
		if (this._bindGroupLayout && this._layoutKey === layoutKey) {
			return this._bindGroupLayout;
		}

		const unfilterable = new Set<string>();
		this.shader.bindings.forEach((binding) => {
			const bound = binding.kind === "texture" ? this._textures.get(binding.name) : null;
			if (bound && binding.sampleType === "float" && !isFilterableFormat(this._device, bound.texture.format)) {
				unfilterable.add(binding.name);
			}
		});

		const visibility = GPUShaderStage.FRAGMENT;

		this._layoutKey = layoutKey;
		this._bindGroupLayout = this._device.createBindGroupLayout({
			label: `${this.shader.name}-layout`,
			entries: this.shader.bindings.map((binding): GPUBindGroupLayoutEntry => {
				switch (binding.kind) {
					case "uniform":
						return { binding: binding.binding, visibility: visibility | GPUShaderStage.VERTEX, buffer: { type: "uniform" } };
					case "texture":
						return {
							binding: binding.binding,
							visibility,
							texture: {
								sampleType: unfilterable.has(binding.name) ? "unfilterable-float" : (binding.sampleType ?? "float"),
								viewDimension: binding.viewDimension ?? "2d",
							},
						};
					default:
						return {
							binding: binding.binding,
							visibility,
							sampler: { type: unfilterable.has(binding.texture ?? "") ? "non-filtering" : (binding.samplerType ?? "filtering") },
						};
				}
			}),
		});

		this._pipelineLayout = this._device.createPipelineLayout({ label: `${this.shader.name}-pipeline-layout`, bindGroupLayouts: [this._bindGroupLayout] });
		this._bindGroup = null;

		return this._bindGroupLayout;
	}

	private _getBindGroup(): GPUBindGroup | null {
		const layout = this._getBindGroupLayout();
		const bindings = this.shader.bindings;
		const resources = this._boundResources;

		// The resources are compared by identity: the bind group is created again when a texture or a sampler is replaced.
		let changed = !this._bindGroup;

		for (let index = 0; index < bindings.length; ++index) {
			const binding = bindings[index];
			if (binding.kind === "uniform") {
				continue;
			}

			const bound = this._textures.get(binding.kind === "texture" ? binding.name : (binding.texture ?? ""));
			if (!bound) {
				this._bindGroup = null;
				return null;
			}

			let resource: GPUTextureView | GPUSampler;
			if (binding.kind === "texture") {
				resource = bound.texture.view;
			} else {
				const filterable = binding.samplerType !== "comparison" && isFilterableFormat(this._device, bound.texture.format);
				resource = _getPostProcessSampler(this._device, bound.samplingMode ?? "bilinear", bound.addressMode ?? "clamp", filterable);
			}

			if (resources[index] !== resource) {
				resources[index] = resource;
				changed = true;
			}
		}

		if (!changed) {
			return this._bindGroup;
		}

		// The passes reading textures that alternate from one frame to the next (history of the TAA) reuse their bind groups.
		const cached = this._bindGroupsCache.find((entry) => entry.layout === layout && entry.resources.every((resource, index) => resource === resources[index]));
		if (cached) {
			this._bindGroup = cached.group;
			return cached.group;
		}

		this._bindGroup = this._device.createBindGroup({
			label: `${this.shader.name}-bind-group`,
			layout,
			entries: bindings.map(
				(binding, index): GPUBindGroupEntry => ({
					binding: binding.binding,
					resource: binding.kind === "uniform" ? { buffer: this._uniformBuffer } : (resources[index] as GPUTextureView | GPUSampler),
				})
			),
		});

		this._bindGroupsCache.push({ layout, resources: resources.slice(), group: this._bindGroup });
		if (this._bindGroupsCache.length > maxCachedBindGroups) {
			this._bindGroupsCache.shift();
		}

		return this._bindGroup;
	}

	private _getModules(): { vertex: GPUShaderModule; fragment: GPUShaderModule } {
		if (!this._modules) {
			this._modules = {
				vertex: getShaderModule(this._device, `${this.shader.name}-vertex`, this.shader.vertexCode),
				fragment: getShaderModule(this._device, `${this.shader.name}-fragment`, this.shader.fragmentCode),
			};
		}

		return this._modules;
	}

	private _getPipeline(formats: GPUTextureFormat[], blend?: GPUBlendState): GPURenderPipeline {
		// Same targets and blending as the last draw.
		const last = this._lastPipeline;
		if (
			last &&
			last.layout === this._bindGroupLayout &&
			last.blend === blend &&
			last.formats.length === formats.length &&
			last.formats.every((format, index) => format === formats[index])
		) {
			return last.pipeline;
		}

		const localKey = `${this._layoutKey}|${formats.join(",")}|${JSON.stringify(blend ?? null)}`;

		let pipeline = this._pipelines.get(localKey);
		if (!pipeline) {
			pipeline = this._getSharedPipeline(localKey, formats, blend);
			this._pipelines.set(localKey, pipeline);
		}

		this._lastPipeline = { pipeline, layout: this._bindGroupLayout!, formats: formats.slice(), blend };

		return pipeline;
	}

	private _getSharedPipeline(localKey: string, formats: GPUTextureFormat[], blend?: GPUBlendState): GPURenderPipeline {
		let cache = pipelinesCache.get(this._device);
		if (!cache) {
			cache = new Map();
			pipelinesCache.set(this._device, cache);
		}

		const key = `${this._shaderId}|${localKey}`;

		let pipeline = cache.get(key);
		if (!pipeline) {
			const modules = this._getModules();

			pipeline = this._device.createRenderPipeline({
				label: this.shader.name,
				layout: this._pipelineLayout!,
				vertex: { module: modules.vertex, entryPoint: "bjsVertex" },
				fragment: {
					module: modules.fragment,
					entryPoint: "bjsFragment",
					targets: formats.map((format, index) => ({ format, blend: index === 0 ? blend : undefined })),
				},
				primitive: { topology: "triangle-list" },
			});

			cache.set(key, pipeline);
		}

		return pipeline;
	}
}
