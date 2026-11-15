import { EngineContext, Mesh } from "@babylonjs/lite";

import { preprocessWGSL, WGSLDefines } from "../wgsl";
import { _writeJitteredViewProjection } from "./jitter";
import { _getCurrentEncoder, _getDevice } from "./pass";
import { _getMeshDistanceToCamera, IMeshPassMaterial, IMeshPassTexture } from "./mesh-materials";

/**
 * Defines a mesh drawn by a mesh pass.
 */
export interface IMeshPassDraw {
	mesh: Mesh;
	/**
	 * Defines how the alpha of the material of the mesh is computed.
	 */
	material: IMeshPassMaterial;
	/**
	 * Defines the alpha multiplied by the alpha of the textures: the alpha of the glow color (glow), or the alpha of the
	 * material (velocity).
	 */
	alpha: number;
	/**
	 * Defines the alpha below which the fragments are discarded when the material is alpha tested.
	 */
	alphaCutOff: number;
	/**
	 * Defines wether or not the mesh writes the color targets (depth only otherwise).
	 */
	writeColor: boolean;
	/**
	 * Defines the emissive texture of the glow. "decode" converts its colors to gamma space.
	 */
	emissive?: (IMeshPassTexture & { decode: boolean }) | null;
	/**
	 * Defines the glow color (rgb) and the intensity of the glow of the mesh.
	 */
	glowColor?: number[];
	glowIntensity?: number;
	/**
	 * Defines wether or not the front faces are culled instead of the back faces (depth of the back faces).
	 */
	reverseCulling?: boolean;
}

/**
 * Defines the outputs of a mesh pass.
 */
export interface IMeshPassOutputs {
	/**
	 * Glow color (glow map of the glow layer).
	 */
	glow?: boolean;
	/**
	 * Velocity encoded as the pre-pass renderer of Babylon.js encodes it ("PREPASS_VELOCITY").
	 */
	velocity?: boolean;
	/**
	 * Linear velocity of the pre-pass renderer of Babylon.js ("PREPASS_VELOCITY_LINEAR").
	 */
	linearVelocity?: boolean;
	/**
	 * Depth of the depth buffer of the pre-pass renderer of Babylon.js ("PREPASS_SCREENSPACE_DEPTH").
	 */
	screenDepth?: boolean;
	/**
	 * Depth of the depth renderer of Babylon.js: "(z + depthValues.x) / depthValues.y", "z" being the depth of the clip
	 * space.
	 */
	depthMetric?: boolean;
	/**
	 * Depth of the view of the depth renderer of Babylon.js ("STORE_CAMERASPACE_Z").
	 */
	viewDepth?: boolean;
	/**
	 * Depth of the depth buffer of the depth renderer of Babylon.js ("NONLINEARDEPTH").
	 */
	nonLinearDepth?: boolean;
}

/**
 * Defines the order of the color targets of the outputs of a mesh pass.
 */
const meshPassOutputs: (keyof IMeshPassOutputs)[] = ["glow", "velocity", "linearVelocity", "screenDepth", "depthMetric", "viewDepth", "nonLinearDepth"];

/**
 * Defines the targets of a mesh pass: the color targets (in the order of the outputs: glow, velocity, linear velocity,
 * screen depth, depth metric, view depth, non linear depth) and the depth.
 */
export interface IMeshPassTarget {
	colors: { view: GPUTextureView; format: GPUTextureFormat; clearValue: GPUColor }[];
	depth: { view: GPUTextureView; format: GPUTextureFormat };
}

/**
 * Defines the matrices of the camera used by a mesh pass (Babylon.js layout).
 */
export interface IMeshPassCamera {
	viewProjection: ArrayLike<number>;
	/**
	 * Defines the view projection of the previous frame (velocity).
	 */
	previousViewProjection?: ArrayLike<number>;
	/**
	 * Defines the view matrix (depth of the view).
	 */
	view?: ArrayLike<number>;
	/**
	 * Defines the values of the depth metric of the depth renderer of Babylon.js ("depthValues").
	 */
	depthValues?: [number, number];
}

interface IMeshInternals {
	_gpu?: {
		positionBuffer: GPUBuffer | null;
		uvBuffer: GPUBuffer | null;
		uv2Buffer: GPUBuffer | null;
		colorBuffer: GPUBuffer | null;
		indexBuffer: GPUBuffer | null;
		indexCount: number;
		indexFormat: GPUIndexFormat;
		_firstIndex?: number;
		_baseVertex?: number;
		_vbLayout?: Record<string, { _stride: number; _offset: number } | undefined>;
	};
	_primitive?: { frontFace?: GPUFrontFace };
	thinInstances?: { count: number; _gpuBuffer: GPUBuffer | null } | null;
}

/**
 * Size of the uniforms of a mesh: world, previous world, diffuse, opacity and emissive matrices, alpha parameters,
 * orientation of the textures, glow color and glow parameters.
 */
const meshUniformsFloatCount = 5 * 16 + 4 * 4;

const defaultGlowColor = [0, 0, 0];

/**
 * Returns the bits of the flags of a pipeline describing how the given texture is sampled (none, first or second set of
 * texture coordinates).
 */
function textureBits(texture: IMeshPassTexture | null | undefined): number {
	return texture ? (texture.uv2 ? 2 : 1) : 0;
}

const meshPassShaderWGSL = /* wgsl */ `
struct MeshPassScene {
	viewProjection: mat4x4<f32>,
	previousViewProjection: mat4x4<f32>,
	view: mat4x4<f32>,
	// xy: offset of the vertices in clip space, applied once the velocity is computed (TAA).
	jitter: vec4<f32>,
	// xy: "depthValues" of the depth renderer of Babylon.js.
	depthValues: vec4<f32>,
};

struct MeshPassMesh {
	world: mat4x4<f32>,
	previousWorld: mat4x4<f32>,
	diffuseMatrix: mat4x4<f32>,
	opacityMatrix: mat4x4<f32>,
	emissiveMatrix: mat4x4<f32>,
	// x: alpha, y: level of the opacity texture, z: alpha cutoff of the alpha test, w: alpha above which the geometry is
	// written (velocity).
	alphaParams: vec4<f32>,
	// Wether or not the diffuse (x), opacity (y) and emissive (z) textures store their first row at the top of the image.
	invertY: vec4<f32>,
	glowColor: vec4<f32>,
	// x: intensity of the glow.
	glowParams: vec4<f32>,
};

@group(0) @binding(0) var<uniform> scene: MeshPassScene;
@group(0) @binding(1) var<uniform> mesh: MeshPassMesh;
#ifdef DIFFUSE
@group(0) @binding(2) var diffuseSampler: texture_2d<f32>;
@group(0) @binding(3) var diffuseSamplerSampler: sampler;
#endif
#ifdef OPACITY
@group(0) @binding(4) var opacitySampler: texture_2d<f32>;
@group(0) @binding(5) var opacitySamplerSampler: sampler;
#endif
#ifdef EMISSIVE
@group(0) @binding(6) var emissiveSampler: texture_2d<f32>;
@group(0) @binding(7) var emissiveSamplerSampler: sampler;
#endif
#ifdef THIN_INSTANCES
@group(0) @binding(8) var<storage, read> instances: array<mat4x4<f32>>;
#endif

struct VertexInput {
	@location(0) position: vec3<f32>,
#ifdef UV1
	@location(1) uv: vec2<f32>,
#endif
#ifdef UV2
	@location(2) uv2: vec2<f32>,
#endif
#ifdef VERTEXALPHA
	@location(3) color: vec4<f32>,
#endif
	@builtin(instance_index) instance: u32,
};

struct VertexOutput {
	@builtin(position) position: vec4<f32>,
#ifdef DIFFUSE
	@location(0) vUVDiffuse: vec2<f32>,
#endif
#ifdef OPACITY
	@location(1) vUVOpacity: vec2<f32>,
#endif
#ifdef EMISSIVE
	@location(2) vUVEmissive: vec2<f32>,
#endif
#ifdef VERTEXALPHA
	@location(3) vColor: vec4<f32>,
#endif
#ifdef VELOCITY
	@location(4) vCurrentPosition: vec4<f32>,
	@location(5) vPreviousPosition: vec4<f32>,
#endif
#ifdef DEPTH_METRIC
	@location(6) vDepthMetric: f32,
#endif
#ifdef VIEW_DEPTH
	@location(7) vViewDepth: f32,
#endif
};

struct FragmentOutput {
#ifdef GLOW
	@location(GLOW_LOCATION) glow: vec4<f32>,
#endif
#ifdef VELOCITY_ENCODED
	@location(VELOCITY_ENCODED_LOCATION) velocity: vec4<f32>,
#endif
#ifdef VELOCITY_LINEAR
	@location(VELOCITY_LINEAR_LOCATION) linearVelocity: vec4<f32>,
#endif
#ifdef SCREEN_DEPTH
	@location(SCREEN_DEPTH_LOCATION) screenDepth: vec4<f32>,
#endif
#ifdef DEPTH_METRIC
	@location(DEPTH_METRIC_LOCATION) depthMetric: vec4<f32>,
#endif
#ifdef VIEW_DEPTH
	@location(VIEW_DEPTH_LOCATION) viewDepth: vec4<f32>,
#endif
#ifdef NONLINEAR_DEPTH
	@location(NONLINEAR_DEPTH_LOCATION) nonLinearDepth: vec4<f32>,
#endif
};

// Same as Babylon.js: the texture coordinates are transformed by the texture matrix. Babylon Lite doesn't flip the
// images when uploading them: the textures storing their first row at the top of the image are sampled upside down.
fn meshPassTextureUV(matrix: mat4x4<f32>, uv: vec2<f32>, invertY: f32) -> vec2<f32> {
	let transformed = (matrix * vec4<f32>(uv, 1.0, 0.0)).xy;
	return select(transformed, vec2<f32>(transformed.x, 1.0 - transformed.y), invertY > 0.5);
}

@vertex
fn meshPassVertex(input: VertexInput) -> VertexOutput {
	var finalWorld = mesh.world;
	var finalPreviousWorld = mesh.previousWorld;
#ifdef THIN_INSTANCES
	let instance = instances[input.instance];
	finalWorld = mesh.world * instance;
	finalPreviousWorld = mesh.previousWorld * instance;
#endif

	let worldPosition = finalWorld * vec4<f32>(input.position, 1.0);

	var output: VertexOutput;
	output.position = scene.viewProjection * worldPosition;

#ifdef VELOCITY
	// Same as the velocity of the pre-pass renderer of Babylon.js.
	output.vCurrentPosition = output.position;
	output.vPreviousPosition = scene.previousViewProjection * (finalPreviousWorld * vec4<f32>(input.position, 1.0));
#endif

#ifdef DEPTH_METRIC
	// Same as the "depth" vertex shader of Babylon.js.
	output.vDepthMetric = (output.position.z + scene.depthValues.x) / scene.depthValues.y;
#endif
#ifdef VIEW_DEPTH
	output.vViewDepth = (scene.view * worldPosition).z;
#endif

	// Same as the TAA material manager of Babylon.js: the vertices are offset once the velocity is computed.
	output.position = vec4<f32>(output.position.xy + scene.jitter.xy * output.position.w, output.position.zw);

	// Same as the render targets of Babylon.js with WebGPU: the first row of the targets is the bottom of the image.
	output.position.y = -output.position.y;

#ifdef DIFFUSE
	output.vUVDiffuse = meshPassTextureUV(mesh.diffuseMatrix, input.DIFFUSE_UV, mesh.invertY.x);
#endif
#ifdef OPACITY
	output.vUVOpacity = meshPassTextureUV(mesh.opacityMatrix, input.OPACITY_UV, mesh.invertY.y);
#endif
#ifdef EMISSIVE
	output.vUVEmissive = meshPassTextureUV(mesh.emissiveMatrix, input.EMISSIVE_UV, mesh.invertY.z);
#endif
#ifdef VERTEXALPHA
	output.vColor = input.color;
#endif

	return output;
}

@fragment
fn meshPassFragment(input: VertexOutput) -> FragmentOutput {
	// Same as the alpha of the materials of Babylon.js (and the "glowMapGeneration" shader of the glow layer).
	var alpha = mesh.alphaParams.x;

#ifdef DIFFUSE
	alpha *= textureSample(diffuseSampler, diffuseSamplerSampler, input.vUVDiffuse).a;
#endif

#ifdef OPACITY
	let opacityMap = textureSample(opacitySampler, opacitySamplerSampler, input.vUVOpacity);
#ifdef OPACITYRGB
	alpha *= clamp(dot(opacityMap.rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
#else
	alpha *= opacityMap.a;
#endif
	alpha *= mesh.alphaParams.y;
#endif

#ifdef VERTEXALPHA
	alpha *= input.vColor.a;
#endif

#ifdef ALPHATEST
	if (alpha < mesh.alphaParams.z) {
		discard;
	}
#endif

	var output: FragmentOutput;

	// Same as the "writeGeometryInfo" of the pre-pass renderer of Babylon.js.
#ifdef ALPHATEST
	let writeGeometryInfo = 1.0;
#else
	let writeGeometryInfo = select(0.0, 1.0, alpha > mesh.alphaParams.w);
#endif

#ifdef GLOW
	// Same as the "glowMapGeneration" fragment shader of Babylon.js (glow layer).
	let finalColor = vec4<f32>(mesh.glowColor.rgb, alpha);
#ifdef EMISSIVE
	var emissive = textureSample(emissiveSampler, emissiveSamplerSampler, input.vUVEmissive);
#ifdef EMISSIVE_DECODE
	// The materials of Babylon Lite decode the colors of the emissive textures: the glow reads them in gamma space, as
	// Babylon.js does ("toGammaSpace").
	emissive = vec4<f32>(pow(emissive.rgb, vec3<f32>(1.0 / 2.2)), emissive.a);
#endif
	output.glow = emissive * finalColor * mesh.glowParams.x;
#else
	output.glow = finalColor * mesh.glowParams.x;
#endif
#endif

#ifdef VELOCITY
#ifdef VELOCITY_ENCODED
	let a = (input.vCurrentPosition.xy / input.vCurrentPosition.w) * 0.5 + 0.5;
	let b = (input.vPreviousPosition.xy / input.vPreviousPosition.w) * 0.5 + 0.5;
	var velocity = abs(a - b);
	velocity = vec2<f32>(pow(velocity.x, 1.0 / 3.0), pow(velocity.y, 1.0 / 3.0)) * sign(a - b) * 0.5 + 0.5;
	output.velocity = vec4<f32>(velocity, 0.0, writeGeometryInfo);
#endif
#ifdef VELOCITY_LINEAR
	let linearVelocity = vec2<f32>(0.5) * ((input.vPreviousPosition.xy / input.vPreviousPosition.w) - (input.vCurrentPosition.xy / input.vCurrentPosition.w));
	output.linearVelocity = vec4<f32>(linearVelocity, 0.0, writeGeometryInfo);
#endif
#endif

#ifdef SCREEN_DEPTH
	output.screenDepth = vec4<f32>(input.position.z, 0.0, 0.0, writeGeometryInfo);
#endif

	// Same as the "depth" fragment shader of Babylon.js.
#ifdef DEPTH_METRIC
	output.depthMetric = vec4<f32>(input.vDepthMetric, 0.0, 0.0, 1.0);
#endif
#ifdef VIEW_DEPTH
	output.viewDepth = vec4<f32>(input.vViewDepth, 0.0, 0.0, 1.0);
#endif
#ifdef NONLINEAR_DEPTH
	output.nonLinearDepth = vec4<f32>(input.position.z, 0.0, 0.0, 0.0);
#endif

	return output;
}
`;

/**
 * Sorts the given meshes as Babylon.js renders them: the opaque meshes, the alpha tested meshes, then the transparent
 * meshes from back to front.
 * @param draws defines the meshes to sort.
 * @param cameraWorld defines the world matrix of the camera.
 */
export function _sortMeshPassDraws(draws: IMeshPassDraw[], cameraWorld: ArrayLike<number>): IMeshPassDraw[] {
	const opaque: IMeshPassDraw[] = [];
	const alphaTest: IMeshPassDraw[] = [];
	const transparent: { draw: IMeshPassDraw; distance: number }[] = [];

	draws.forEach((draw) => {
		if (draw.material.transparent) {
			transparent.push({ draw, distance: _getMeshDistanceToCamera(draw.mesh, cameraWorld) });
		} else if (draw.material.alphaTest) {
			alphaTest.push(draw);
		} else {
			opaque.push(draw);
		}
	});

	transparent.sort((a, b) => b.distance - a.distance);

	return [...opaque, ...alphaTest, ...transparent.map((t) => t.draw)];
}

/**
 * Defines the shader of a render pipeline of a mesh pass: defines, sources of the texture coordinates of the textures
 * (diffuse, opacity, emissive) and vertex buffers.
 */
interface IMeshPipelineShader {
	defines: WGSLDefines;
	uvs: string;
	buffers: GPUVertexBufferLayout[];
}

/**
 * Defines the rasterization and the blending of a render pipeline of a mesh pass.
 */
interface IMeshPipelineState {
	cullMode: GPUCullMode;
	frontFace: GPUFrontFace;
	transparent: boolean;
	writeColor: boolean;
}

/**
 * Defines the commands drawing a mesh, recorded in the render bundle of a mesh pass.
 */
interface IMeshDrawCommand {
	pipeline: GPURenderPipeline | null;
	bindGroup: GPUBindGroup | null;
	vertexBuffers: (GPUBuffer | null)[];
	vertexBufferCount: number;
	indexBuffer: GPUBuffer | null;
	indexFormat: GPUIndexFormat;
	indexCount: number;
	instanceCount: number;
	firstIndex: number;
	baseVertex: number;
}

function createDrawCommand(): IMeshDrawCommand {
	return {
		pipeline: null,
		bindGroup: null,
		vertexBuffers: [null, null, null, null],
		vertexBufferCount: 0,
		indexBuffer: null,
		indexFormat: "uint32",
		indexCount: 0,
		instanceCount: 0,
		firstIndex: 0,
		baseVertex: 0,
	};
}

function isSameDrawCommand(a: IMeshDrawCommand, b: IMeshDrawCommand): boolean {
	if (
		a.pipeline !== b.pipeline ||
		a.bindGroup !== b.bindGroup ||
		a.vertexBufferCount !== b.vertexBufferCount ||
		a.indexBuffer !== b.indexBuffer ||
		a.indexFormat !== b.indexFormat ||
		a.indexCount !== b.indexCount ||
		a.instanceCount !== b.instanceCount ||
		a.firstIndex !== b.firstIndex ||
		a.baseVertex !== b.baseVertex
	) {
		return false;
	}

	for (let i = 0; i < a.vertexBufferCount; ++i) {
		if (a.vertexBuffers[i] !== b.vertexBuffers[i]) {
			return false;
		}
	}

	return true;
}

function copyDrawCommand(source: IMeshDrawCommand, target: IMeshDrawCommand): void {
	target.pipeline = source.pipeline;
	target.bindGroup = source.bindGroup;
	target.vertexBufferCount = source.vertexBufferCount;
	for (let i = 0; i < source.vertexBufferCount; ++i) {
		target.vertexBuffers[i] = source.vertexBuffers[i];
	}
	target.indexBuffer = source.indexBuffer;
	target.indexFormat = source.indexFormat;
	target.indexCount = source.indexCount;
	target.instanceCount = source.instanceCount;
	target.firstIndex = source.firstIndex;
	target.baseVertex = source.baseVertex;
}

/**
 * Defines the resources of a mesh drawn by a mesh pass, kept between the frames: the render pipeline (created again
 * when the shader, the vertex layout or the targets change), the uniforms and the bindings.
 */
interface IMeshDrawCache {
	pipelineFlags: number;
	targetKey: string;
	vertexLayout: unknown;
	pipeline: GPURenderPipeline | null;
	buffer: GPUBuffer;
	uploaded: Uint32Array | null;
	bindGroup: GPUBindGroup | null;
	resources: unknown[];
}

/**
 * Draws the meshes of a scene with the shaders of the tools: the glow map of the glow layer, the velocity and the screen
 * space depth of the pre-pass renderer of Babylon.js, and the depths of the depth renderer of Babylon.js. The materials
 * of Babylon Lite can't output the velocity of the meshes, and the geometry renderer tasks of Babylon Lite run the whole
 * shaders of the materials to output the depth. The meshes are drawn from their GPU buffers (positions, texture
 * coordinates, vertex colors and thin instances), as the GPU picker of Babylon Lite does: the morph targets and the
 * skeletons are not applied.
 */
export class MeshPassRenderer {
	private _engine: EngineContext;
	private _name: string;

	private _sceneBuffer: GPUBuffer | null = null;
	private _sceneData: Float32Array = new Float32Array(56);
	private _meshData: Float32Array = new Float32Array(meshUniformsFloatCount);
	private _meshDataBits: Uint32Array = new Uint32Array(this._meshData.buffer);
	private _meshes: WeakMap<Mesh, IMeshDrawCache> = new WeakMap();
	private _targetKey: string = "";
	private _outputsMask: number = 0;

	private _commands: IMeshDrawCommand[] = [];
	private _bundle: { bundle: GPURenderBundle; targetKey: string; commands: IMeshDrawCommand[]; count: number } | null = null;
	private _pipelines: Map<string, GPURenderPipeline> = new Map();
	private _modules: Map<string, GPUShaderModule> = new Map();

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 * @param name defines the name of the pass (label of the GPU resources).
	 */
	public constructor(engine: EngineContext, name: string) {
		this._engine = engine;
		this._name = name;
	}

	/**
	 * Draws the given meshes into the given targets.
	 * @param draws defines the meshes to draw, sorted (see `_sortMeshPassDraws`).
	 * @param camera defines the matrices of the camera.
	 * @param outputs defines the outputs of the pass, in the order of the color targets.
	 * @param target defines the textures to draw into.
	 * @param previousWorlds defines the world matrices of the meshes of the previous frame (velocity).
	 * @returns the number of draw calls.
	 */
	public render(draws: IMeshPassDraw[], camera: IMeshPassCamera, outputs: IMeshPassOutputs, target: IMeshPassTarget, previousWorlds?: WeakMap<Mesh, ArrayLike<number>>): number {
		const encoder = _getCurrentEncoder(this._engine);
		if (!encoder) {
			return 0;
		}

		const device = _getDevice(this._engine);

		this._sceneBuffer ??= device.createBuffer({ label: `${this._name}-scene`, size: this._sceneData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
		const sceneData = this._sceneData;
		const previousViewProjection = camera.previousViewProjection ?? camera.viewProjection;
		for (let i = 0; i < 16; ++i) {
			sceneData[i] = camera.viewProjection[i];
			sceneData[16 + i] = previousViewProjection[i];
			sceneData[32 + i] = camera.view?.[i] ?? 0;
		}
		sceneData.fill(0, 48);
		sceneData[52] = camera.depthValues?.[0] ?? 0;
		sceneData[53] = camera.depthValues?.[1] ?? 1;
		device.queue.writeBuffer(this._sceneBuffer, 0, sceneData);

		this._targetKey = `${target.colors.map((color) => color.format).join(",")}|${target.depth.format}`;
		this._outputsMask = meshPassOutputs.reduce((mask, output, index) => (outputs[output] ? mask | (1 << index) : mask), 0);

		// The draw commands are recorded in a render bundle, recorded again only when they changed: the uniforms of the meshes
		// are updated in their buffers.
		const commands = this._commands;
		let count = 0;
		draws.forEach((draw) => {
			commands[count] ??= createDrawCommand();
			const command = commands[count];
			if (this._prepareMesh(draw, outputs, target, command, previousWorlds?.get(draw.mesh))) {
				++count;
			}
		});

		const bundle = this._getBundle(count, target);

		const pass = encoder.beginRenderPass({
			label: this._name,
			colorAttachments: target.colors.map((color) => ({ view: color.view, clearValue: color.clearValue, loadOp: "clear", storeOp: "store" })),
			depthStencilAttachment: { view: target.depth.view, depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" },
		});

		pass.executeBundles([bundle]);
		pass.end();

		return count;
	}

	/**
	 * Returns the render bundle drawing the first "count" commands, recorded again when they changed since it was recorded.
	 */
	private _getBundle(count: number, target: IMeshPassTarget): GPURenderBundle {
		const recorded = this._bundle;
		if (recorded && recorded.targetKey === this._targetKey && recorded.count === count) {
			let same = true;
			for (let i = 0; same && i < count; ++i) {
				same = isSameDrawCommand(this._commands[i], recorded.commands[i]);
			}

			if (same) {
				return recorded.bundle;
			}
		}

		const encoder = _getDevice(this._engine).createRenderBundleEncoder({
			label: this._name,
			colorFormats: target.colors.map((color) => color.format),
			depthStencilFormat: target.depth.format,
		});

		const snapshot = recorded?.commands ?? [];
		for (let i = 0; i < count; ++i) {
			const command = this._commands[i];
			const previous = i > 0 ? this._commands[i - 1] : null;

			if (command.pipeline !== previous?.pipeline) {
				encoder.setPipeline(command.pipeline!);
			}

			encoder.setBindGroup(0, command.bindGroup);

			for (let slot = 0; slot < command.vertexBufferCount; ++slot) {
				encoder.setVertexBuffer(slot, command.vertexBuffers[slot]);
			}

			encoder.setIndexBuffer(command.indexBuffer!, command.indexFormat);
			encoder.drawIndexed(command.indexCount, command.instanceCount, command.firstIndex, command.baseVertex);

			snapshot[i] ??= createDrawCommand();
			copyDrawCommand(command, snapshot[i]);
		}

		this._bundle = { bundle: encoder.finish(), targetKey: this._targetKey, commands: snapshot, count };

		return this._bundle.bundle;
	}

	/**
	 * Offsets the view projection of the camera of the last rendering in clip space (see
	 * `IPostProcessContext.jitterProjection`). The uniforms are written before the commands of the frame are submitted:
	 * the offset applies to the meshes drawn this frame.
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 */
	public jitterViewProjection(x: number, y: number): void {
		if (this._sceneBuffer) {
			_writeJitteredViewProjection(_getDevice(this._engine), { buffer: this._sceneBuffer, data: this._sceneData }, x, y);
		}
	}

	/**
	 * Offsets the vertices of the meshes of the last rendering in clip space once their velocity is computed (see
	 * `IPostProcessContext.jitterVertices`).
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 */
	public jitterVertices(x: number, y: number): void {
		if (this._sceneBuffer) {
			_getDevice(this._engine).queue.writeBuffer(this._sceneBuffer, 48 * 4, new Float32Array([x, y, 0, 0]));
		}
	}

	/**
	 * Disposes the resources of the renderer.
	 */
	public dispose(): void {
		this._sceneBuffer?.destroy();
		this._sceneBuffer = null;
		this._meshes = new WeakMap();
		this._commands = [];
		this._bundle = null;
		this._pipelines.clear();
		this._modules.clear();
	}

	/**
	 * Prepares the resources drawing the given mesh (pipeline, uniforms and bindings) and fills the given command.
	 * @returns wether or not the mesh is drawn.
	 */
	private _prepareMesh(draw: IMeshPassDraw, outputs: IMeshPassOutputs, target: IMeshPassTarget, command: IMeshDrawCommand, previousWorld?: ArrayLike<number>): boolean {
		const mesh = draw.mesh as unknown as IMeshInternals;
		const gpu = mesh._gpu;
		if (!gpu?.positionBuffer || !gpu.indexBuffer || !gpu.indexCount) {
			return false;
		}

		const thinInstances = mesh.thinInstances;
		if (thinInstances && (thinInstances.count <= 0 || !thinInstances._gpuBuffer)) {
			return false;
		}

		const material = draw.material;
		const emissive = outputs.glow ? (draw.emissive ?? null) : null;

		// Texture coordinates and vertex colors read by the shader.
		const meshTextures = [material.diffuse, material.opacity, emissive];
		const uv1 = (!!material.diffuse && !material.diffuse.uv2) || (!!material.opacity && !material.opacity.uv2) || (!!emissive && !emissive.uv2);
		const uv2 = !!material.diffuse?.uv2 || !!material.opacity?.uv2 || !!emissive?.uv2;
		const vertexAlpha = material.vertexAlpha && !!gpu.colorBuffer;

		if ((uv1 && !gpu.uvBuffer) || (uv2 && !gpu.uv2Buffer)) {
			return false;
		}

		// Babylon Lite culls the back faces of the meshes (counter clockwise front faces, clockwise for the mirrored meshes):
		// the targets are drawn upside down, which reverses the winding.
		const frontFace: GPUFrontFace = (mesh._primitive?.frontFace ?? "ccw") === "ccw" ? "cw" : "ccw";
		const cullMode: GPUCullMode = material.doubleSided ? "none" : draw.reverseCulling ? "front" : "back";

		const device = _getDevice(this._engine);

		let cache = this._meshes.get(draw.mesh);
		if (!cache) {
			cache = {
				pipelineFlags: -1,
				targetKey: "",
				vertexLayout: null,
				pipeline: null,
				buffer: device.createBuffer({ label: `${this._name}-mesh`, size: meshUniformsFloatCount * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
				uploaded: null,
				bindGroup: null,
				resources: [],
			};
			this._meshes.set(draw.mesh, cache);
		}

		// Render pipeline, created again only when the shader, the vertex layout or the targets changed.
		const pipelineFlags =
			this._outputsMask |
			(textureBits(material.diffuse) << 7) |
			(textureBits(material.opacity) << 9) |
			(textureBits(emissive) << 11) |
			(material.opacity?.rgb ? 1 << 13 : 0) |
			(emissive?.decode ? 1 << 14 : 0) |
			(material.alphaTest ? 1 << 15 : 0) |
			(vertexAlpha ? 1 << 16 : 0) |
			(thinInstances ? 1 << 17 : 0) |
			(material.transparent ? 1 << 18 : 0) |
			(draw.writeColor ? 1 << 19 : 0) |
			(cullMode === "none" ? 1 << 20 : cullMode === "front" ? 1 << 21 : 0) |
			(frontFace === "ccw" ? 1 << 22 : 0);

		if (!cache.pipeline || cache.pipelineFlags !== pipelineFlags || cache.targetKey !== this._targetKey || cache.vertexLayout !== gpu._vbLayout) {
			const layout = gpu._vbLayout ?? {};
			const buffers: GPUVertexBufferLayout[] = [this._getVertexBufferLayout(0, "float32x3", 12, layout.position)];
			if (uv1) {
				buffers.push(this._getVertexBufferLayout(1, "float32x2", 8, layout.uv));
			}
			if (uv2) {
				buffers.push(this._getVertexBufferLayout(2, "float32x2", 8, layout.uv2));
			}
			if (vertexAlpha) {
				buffers.push(this._getVertexBufferLayout(3, "float32x4", 16, layout.color));
			}

			const uvSource = (texture: IMeshPassTexture | null) => (texture?.uv2 ? "uv2" : "uv");
			const defines: WGSLDefines = {
				GLOW: !!outputs.glow,
				VELOCITY: !!(outputs.velocity || outputs.linearVelocity),
				VELOCITY_ENCODED: !!outputs.velocity,
				VELOCITY_LINEAR: !!outputs.linearVelocity,
				SCREEN_DEPTH: !!outputs.screenDepth,
				DEPTH_METRIC: !!outputs.depthMetric,
				VIEW_DEPTH: !!outputs.viewDepth,
				NONLINEAR_DEPTH: !!outputs.nonLinearDepth,
				GLOW_LOCATION: this._getOutputLocation(outputs, "glow"),
				VELOCITY_ENCODED_LOCATION: this._getOutputLocation(outputs, "velocity"),
				VELOCITY_LINEAR_LOCATION: this._getOutputLocation(outputs, "linearVelocity"),
				SCREEN_DEPTH_LOCATION: this._getOutputLocation(outputs, "screenDepth"),
				DEPTH_METRIC_LOCATION: this._getOutputLocation(outputs, "depthMetric"),
				VIEW_DEPTH_LOCATION: this._getOutputLocation(outputs, "viewDepth"),
				NONLINEAR_DEPTH_LOCATION: this._getOutputLocation(outputs, "nonLinearDepth"),
				DIFFUSE: !!material.diffuse,
				OPACITY: !!material.opacity,
				OPACITYRGB: !!material.opacity?.rgb,
				EMISSIVE: !!emissive,
				EMISSIVE_DECODE: !!emissive?.decode,
				ALPHATEST: material.alphaTest,
				VERTEXALPHA: vertexAlpha,
				UV1: uv1,
				UV2: uv2,
				THIN_INSTANCES: !!thinInstances,
			};

			const uvs = `${uvSource(material.diffuse)}|${uvSource(material.opacity)}|${uvSource(emissive)}`;

			cache.pipeline = this._getPipeline({ defines, uvs, buffers }, { cullMode, frontFace, transparent: material.transparent, writeColor: draw.writeColor }, target);
			cache.pipelineFlags = pipelineFlags;
			cache.targetKey = this._targetKey;
			cache.vertexLayout = gpu._vbLayout;
		}

		const pipeline = cache.pipeline;

		// Uniforms of the mesh, uploaded only when they changed.
		const data = this._meshData;
		const world = draw.mesh.worldMatrix;
		for (let i = 0; i < 16; ++i) {
			data[i] = world[i];
			data[16 + i] = previousWorld ? previousWorld[i] : world[i];
		}

		for (let index = 0; index < 3; ++index) {
			const texture = meshTextures[index];
			for (let i = 0; i < 16; ++i) {
				data[32 + index * 16 + i] = texture ? texture.matrix[i] : 0;
			}
			data[84 + index] = texture?.texture.invertY ? 1 : 0;
		}
		data[87] = 0;

		data[80] = draw.alpha;
		data[81] = material.opacity?.level ?? 1;
		data[82] = draw.alphaCutOff;
		// Same as Babylon.js: the PBR materials write the geometry where their alpha is greater than their alpha cutoff
		// ("ALPHATESTVALUE"), the standard materials where it is greater than 0.4.
		data[83] = material.type === "pbr" ? material.alphaCutOff : 0.4;

		const glowColor = draw.glowColor ?? defaultGlowColor;
		data[88] = glowColor[0];
		data[89] = glowColor[1];
		data[90] = glowColor[2];
		data[91] = 1;
		data[92] = draw.glowIntensity ?? 1;
		data[93] = 0;
		data[94] = 0;
		data[95] = 0;

		const bits = this._meshDataBits;
		const uploaded = cache.uploaded;
		let changed = !uploaded;
		for (let i = 0; !changed && i < bits.length; ++i) {
			changed = bits[i] !== uploaded![i];
		}

		if (changed) {
			device.queue.writeBuffer(cache.buffer, 0, data);
			if (uploaded) {
				uploaded.set(bits);
			} else {
				cache.uploaded = new Uint32Array(bits);
			}
		}

		// Bindings, created again only when a resource changed.
		const resources = cache.resources;
		let resourceCount = 0;
		let resourcesChanged = !cache.bindGroup;

		const track = (resource: unknown) => {
			if (resources[resourceCount] !== resource) {
				resources[resourceCount] = resource;
				resourcesChanged = true;
			}
			++resourceCount;
		};

		track(pipeline);
		track(this._sceneBuffer);
		meshTextures.forEach((texture) => {
			track(texture?.texture.view ?? null);
			track(texture?.texture.sampler ?? null);
		});
		track(thinInstances?._gpuBuffer ?? null);

		if (resourcesChanged) {
			const entries: GPUBindGroupEntry[] = [
				{ binding: 0, resource: { buffer: this._sceneBuffer! } },
				{ binding: 1, resource: { buffer: cache.buffer } },
			];

			meshTextures.forEach((texture, index) => {
				if (texture) {
					entries.push({ binding: 2 + index * 2, resource: texture.texture.view });
					entries.push({ binding: 3 + index * 2, resource: texture.texture.sampler });
				}
			});

			if (thinInstances?._gpuBuffer) {
				entries.push({ binding: 8, resource: { buffer: thinInstances._gpuBuffer } });
			}

			cache.bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
		}

		command.pipeline = pipeline;
		command.bindGroup = cache.bindGroup;

		let slot = 0;
		command.vertexBuffers[slot++] = gpu.positionBuffer;
		if (uv1) {
			command.vertexBuffers[slot++] = gpu.uvBuffer;
		}
		if (uv2) {
			command.vertexBuffers[slot++] = gpu.uv2Buffer;
		}
		if (vertexAlpha) {
			command.vertexBuffers[slot++] = gpu.colorBuffer;
		}
		command.vertexBufferCount = slot;

		command.indexBuffer = gpu.indexBuffer;
		command.indexFormat = gpu.indexFormat;
		command.indexCount = gpu.indexCount;
		command.instanceCount = thinInstances?.count ?? 1;
		command.firstIndex = gpu._firstIndex ?? 0;
		command.baseVertex = gpu._baseVertex ?? 0;

		return true;
	}

	/**
	 * Returns the location of the color target of the given output (see `meshPassOutputs`).
	 */
	private _getOutputLocation(outputs: IMeshPassOutputs, output: keyof IMeshPassOutputs): number {
		let location = 0;
		for (const name of meshPassOutputs) {
			if (name === output) {
				return location;
			}
			if (outputs[name]) {
				++location;
			}
		}

		return location;
	}

	private _getVertexBufferLayout(location: number, format: GPUVertexFormat, defaultStride: number, interleave?: { _stride: number; _offset: number }): GPUVertexBufferLayout {
		return {
			arrayStride: interleave?._stride ?? defaultStride,
			stepMode: "vertex",
			attributes: [{ shaderLocation: location, offset: interleave?._offset ?? 0, format }],
		};
	}

	private _getPipeline(shader: IMeshPipelineShader, state: IMeshPipelineState, target: IMeshPassTarget): GPURenderPipeline {
		const { defines, uvs, buffers } = shader;
		const { cullMode, frontFace, transparent, writeColor } = state;

		const definesKey = Object.keys(defines)
			.map((name) => `${name}=${defines[name]}`)
			.join(",");
		const buffersKey = buffers.map((buffer) => `${buffer.arrayStride}:${(buffer.attributes as GPUVertexAttribute[])[0].offset}`).join(",");
		const formatsKey = target.colors.map((color) => color.format).join(",");

		const key = `${definesKey}|${uvs}|${buffersKey}|${cullMode}|${frontFace}|${transparent}|${writeColor}|${formatsKey}|${target.depth.format}`;

		let pipeline = this._pipelines.get(key);
		if (pipeline) {
			return pipeline;
		}

		const device = _getDevice(this._engine);

		const moduleKey = `${definesKey}|${uvs}`;
		let module = this._modules.get(moduleKey);
		if (!module) {
			const [diffuseUV, opacityUV, emissiveUV] = uvs.split("|");
			const code = preprocessWGSL(meshPassShaderWGSL, defines)
				.replace("input.DIFFUSE_UV", `input.${diffuseUV}`)
				.replace("input.OPACITY_UV", `input.${opacityUV}`)
				.replace("input.EMISSIVE_UV", `input.${emissiveUV}`);

			module = device.createShaderModule({ label: this._name, code });
			this._modules.set(moduleKey, module);
		}

		// Same as the default alpha mode of the materials of Babylon.js ("ALPHA_COMBINE"), for all the targets.
		const blend: GPUBlendState | undefined = transparent
			? {
					color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
					alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
				}
			: undefined;

		pipeline = device.createRenderPipeline({
			label: this._name,
			layout: "auto",
			vertex: { module, entryPoint: "meshPassVertex", buffers },
			fragment: {
				module,
				entryPoint: "meshPassFragment",
				targets: target.colors.map((color) => ({ format: color.format, blend, writeMask: writeColor ? GPUColorWrite.ALL : 0 })),
			},
			primitive: { topology: "triangle-list", cullMode, frontFace },
			depthStencil: {
				format: target.depth.format,
				// The transparent meshes don't write the depth, as Babylon.js does when blending them.
				depthWriteEnabled: !transparent,
				depthCompare: "less-equal",
			},
		});

		this._pipelines.set(key, pipeline);

		return pipeline;
	}
}
