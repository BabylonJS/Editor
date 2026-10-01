import type { Scene } from "@babylonjs/core/scene";
import type { Nullable } from "@babylonjs/core/types";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import type { Material } from "@babylonjs/core/Materials/material";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { MaterialPluginManager } from "@babylonjs/core/Materials/materialPluginManager";
import type { RawTexture2DArray } from "@babylonjs/core/Materials/Textures/rawTexture2DArray";

import { Logger } from "@babylonjs/core/Misc/logger";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Observable, type Observer } from "@babylonjs/core/Misc/observable";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";

import { decodeTerrainPng } from "./png";
import { estimateTerrainPbrSamplers } from "./budget";
import { TERRAIN_WGSL_FRAGMENT } from "./shaders-wgsl";
import { DefaultTerrainGpu, generateTerrainArrayMipmapsWebGPU, type ITerrainGpu } from "./gpu";
import { BrowserTerrainImageDecoder, resizeTerrainImage } from "./image-decoder";
import { TERRAIN_GLSL_FRAGMENT, TERRAIN_GLSL_FRAGMENT_UNIFORMS } from "./shaders-glsl";
import { getTerrainLayerArrayCacheKey, getTerrainLayerSourcePaths, getTerrainLayerTextureSize, isTerrainSourceAlphaData, packTerrainLayerArrays } from "./layer-textures";
import {
	TERRAIN_DATA_VERSION,
	TERRAIN_LAYERS_PER_WEIGHT_MAP,
	TERRAIN_MATERIAL_PLUGIN_CLASS_NAME,
	TERRAIN_MATERIAL_PLUGIN_NAME,
	TERRAIN_MAX_LAYERS,
	TERRAIN_PORTABLE_SAMPLER_BUDGET,
	TerrainDebugView,
	cloneTerrainMaterialData,
	createDefaultTerrainMaterialData,
	parseTerrainMaterialData,
	type ITerrainBudgetInfo,
	type ITerrainDebugOptions,
	type ITerrainDecodedImage,
	type ITerrainImageDecoder,
	type ITerrainLayerData,
	type ITerrainMaterialData,
	type ITerrainWeightMap,
	type TerrainBudgetFeature,
	type TerrainLoadState,
} from "./types";

/** Sampler names of the plugin, always bound (real texture or typed fallback, §5.2.3). */
const TERRAIN_SAMPLER_NAMES: readonly string[] = ["terrainWeights0Sampler", "terrainWeights1Sampler", "terrainAlbedoArraySampler", "terrainNormalArraySampler"];

/**
 * Babylon's built-in PBR configurations: attached to every PBRMaterial, they always push their sampler names, but their samplers are
 * already counted from the defines by estimateTerrainPbrSamplers (§5.2.1), so they are excluded from "other plugins with samplers".
 */
const TERRAIN_BUILTIN_PBR_PLUGIN_CLASS_NAMES: ReadonlySet<string> = new Set([
	"PBRBRDFConfiguration",
	"PBRClearCoatConfiguration",
	"PBRIridescenceConfiguration",
	"PBRAnisotropicConfiguration",
	"PBRSheenConfiguration",
	"PBRSubSurfaceConfiguration",
	"DetailMapConfiguration",
	"DecalMapConfiguration",
]);

/** Features dropped, in this order, while the fragment samplers exceed the budget (§5.2.1). */
const TERRAIN_BUDGET_DROP_ORDER: readonly ("normals" | "weights1" | "albedo")[] = ["normals", "weights1", "albedo"];

/** Layer array builds are debounced after data changes (§5.5.1). */
const TERRAIN_LAYER_BUILD_DEBOUNCE_MS = 50;
/**
 * A load that doesn't settle within this delay stops being pending: "error" state, fallbacks bound, readiness and loadScene unblocked (§5.1).
 * The load itself keeps running and its late result is still bound (slow networks), unless newer data or an explicit reload superseded it.
 */
const TERRAIN_LOAD_TIMEOUT_MS = 30_000;
/** Per-scene LRU of decoded layer sources (§5.5.1). */
const TERRAIN_DECODED_IMAGE_CACHE_SIZE = 16;
/** Layer sources decoded in parallel (§5.5.1). */
const TERRAIN_DECODE_CONCURRENCY = 4;
/** Replaced textures and released arrays are disposed after this number of rendered frames of their scene (§5.2.3). */
const TERRAIN_DEFERRED_DISPOSAL_FRAMES = 2;

/** Bounding box extents below this value are clamped (degenerate meshes), §5.2.2. */
const TERRAIN_MIN_EXTENT = 1e-3;

/** Messages already logged by logTerrainWarningOnce. */
const terrainLoggedWarnings = new Set<string>();

/** Scratch colors of the tint conversion (sRGB → linear). */
const terrainTintColor = new Color3();
const terrainLinearTintColor = new Color3();

/** Per-scene typed fallbacks bound when a resource is missing (§5.2.3). */
interface ITerrainSceneFallbacks {
	/** The GPU seam the fallbacks were created with (recreated when TerrainMaterialPlugin.Gpu changes). */
	readonly gpu: ITerrainGpu;
	/** 1×1 RGBA (255, 0, 0, 0): layer 1 everywhere. */
	weights0: RawTexture | null;
	/** 1×1 RGBA (0, 0, 0, 0). */
	zero: RawTexture | null;
	/** 1×1×1 array (255, 255, 255, 128). */
	albedoArray: RawTexture2DArray | null;
	/** 1×1×1 array (128, 128, 255, 255). */
	normalArray: RawTexture2DArray | null;
}

/** Entry of the per-scene, reference-counted cache of layer texture arrays (§5.5.1). */
interface ITerrainLayerArrayEntry {
	readonly key: string;
	readonly scene: Scene;
	readonly albedo: RawTexture2DArray | null;
	readonly normal: RawTexture2DArray | null;
	/** Level 0 data kept for the WebGPU mip fix after a context/device restore (null when engine.doNotHandleContextLost). */
	readonly level0Albedo: Uint8Array | null;
	readonly level0Normal: Uint8Array | null;
	/** Project-relative source paths (as written in the layer data) that couldn't be loaded or decoded: neutral slices. */
	readonly failedPaths: readonly string[];
	/** Set when a wanted array couldn't be created. */
	readonly error: string | null;
	/** Force epoch of the build that created the entry (see ITerrainLayerArrayBuild.epoch). */
	readonly epoch: number;
	refs: number;
	disposed: boolean;
}

/** Build of a layer-array cache entry in flight (§5.5.1). */
interface ITerrainLayerArrayBuild {
	readonly promise: Promise<ITerrainLayerArrayEntry>;
	/**
	 * terrainLayerForceEpoch when a forced build started (it evicted the decoded sources first, so it reads the files as they are after
	 * every rebuildLayerTextures() call of an epoch <= this value); 0 for builds that weren't forced.
	 */
	readonly epoch: number;
}

interface ITerrainDeferredDisposal {
	frames: number;
	readonly dispose: () => void;
}

interface ITerrainSceneState {
	disposed: boolean;
	fallbacks: ITerrainSceneFallbacks | null;
	readonly entries: Map<string, ITerrainLayerArrayEntry>;
	readonly builds: Map<string, ITerrainLayerArrayBuild>;
	/** Decoded sources keyed by `url|size|exact`, least recently used first. */
	readonly images: Map<string, ITerrainDecodedImage>;
	readonly disposals: ITerrainDeferredDisposal[];
	disposalObserver: Nullable<Observer<Scene>>;
}

interface ITerrainLayerArrayRequest {
	readonly scene: Scene;
	readonly key: string;
	readonly size: number;
	readonly rootUrl: string;
	readonly anisotropy: number;
	readonly layers: ITerrainLayerData[];
	readonly force: boolean;
	/** terrainLayerForceEpoch of the rebuildLayerTextures() call that forced the request (force only). */
	readonly forceEpoch: number;
}

/** One weight map load (all the maps loaded together, §5.6.1). */
interface ITerrainWeightLoad {
	/** Token given to scene.addPendingData. */
	readonly token: object;
	readonly rootUrl: string;
	/** Indices whose result is still awaited. */
	readonly pending: Set<0 | 1>;
	timeout: ReturnType<typeof setTimeout> | null;
	/** true once TERRAIN_LOAD_TIMEOUT_MS elapsed: the load no longer holds the scene (token removed), the maps still awaited are applied when they arrive. */
	timedOut: boolean;
}

const terrainSceneStates = new WeakMap<Scene, ITerrainSceneState>();

/**
 * Incremented by every rebuildLayerTextures() call (sources changed on disk). A forced request is served by any build or entry of its key
 * whose epoch is at least the epoch of its call: the plugins sharing an entry and rebuilt together (one file change) share one new build.
 */
let terrainLayerForceEpoch = 0;

function describeTerrainError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	const message = (error as { message?: unknown } | null)?.message;
	return typeof message === "string" && message ? message : String(error);
}

function logTerrainWarningOnce(message: string): void {
	if (!terrainLoggedWarnings.has(message)) {
		terrainLoggedWarnings.add(message);
		Logger.Warn(message);
	}
}

function copyTerrainJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

/** true when the engine can run the terrain shading: WebGPU or WebGL2 (§5.2.1). */
function isTerrainEngineSupported(engine: AbstractEngine): boolean {
	return engine.isWebGPU || ((engine as unknown as { webGLVersion?: number }).webGLVersion ?? 0) >= 2;
}

function isTerrainGpuAvailable(gpu: ITerrainGpu, engine: AbstractEngine): boolean {
	try {
		return gpu.isAvailable(engine);
	} catch (e) {
		logTerrainWarningOnce(`[Terrain] The terrain GPU seam failed: ${describeTerrainError(e)}`);
		return false;
	}
}

/** Applies TerrainMaterialPlugin.PathResolver (asset renames, §6.10) to a project-relative data path. */
function resolveTerrainDataPath(path: string): string {
	const resolver = TerrainMaterialPlugin.PathResolver;
	if (!resolver) {
		return path;
	}

	try {
		return resolver(path) || path;
	} catch (e) {
		logTerrainWarningOnce(`[Terrain] Can't resolve ${path}: ${describeTerrainError(e)}`);
		return path;
	}
}

function runTerrainDisposal(dispose: () => void): void {
	try {
		dispose();
	} catch (e) {
		Logger.Warn(`[Terrain] Can't dispose a terrain texture: ${describeTerrainError(e)}`);
	}
}

function disposeTerrainFallbacks(fallbacks: ITerrainSceneFallbacks): void {
	fallbacks.weights0?.dispose();
	fallbacks.zero?.dispose();
	fallbacks.albedoArray?.dispose();
	fallbacks.normalArray?.dispose();

	fallbacks.weights0 = null;
	fallbacks.zero = null;
	fallbacks.albedoArray = null;
	fallbacks.normalArray = null;
}

function disposeTerrainLayerArrayEntry(entry: ITerrainLayerArrayEntry): void {
	if (entry.disposed) {
		return;
	}

	entry.disposed = true;
	entry.albedo?.dispose();
	entry.normal?.dispose();

	const state = terrainSceneStates.get(entry.scene);
	if (state?.entries.get(entry.key) === entry) {
		state.entries.delete(entry.key);
	}
}

function disposeTerrainSceneState(scene: Scene, state: ITerrainSceneState): void {
	state.disposed = true;

	if (state.disposalObserver) {
		scene.onAfterRenderObservable.remove(state.disposalObserver);
		state.disposalObserver = null;
	}

	const disposals = state.disposals.splice(0, state.disposals.length);
	disposals.forEach((disposal) => runTerrainDisposal(disposal.dispose));

	const fallbacks = state.fallbacks;
	if (fallbacks) {
		runTerrainDisposal(() => disposeTerrainFallbacks(fallbacks));
	}

	Array.from(state.entries.values()).forEach((entry) => runTerrainDisposal(() => disposeTerrainLayerArrayEntry(entry)));

	state.entries.clear();
	state.builds.clear();
	state.images.clear();

	terrainSceneStates.delete(scene);
}

function getTerrainSceneState(scene: Scene): ITerrainSceneState {
	const existing = terrainSceneStates.get(scene);
	if (existing) {
		return existing;
	}

	const state: ITerrainSceneState = {
		disposed: scene.isDisposed,
		fallbacks: null,
		entries: new Map(),
		builds: new Map(),
		images: new Map(),
		disposals: [],
		disposalObserver: null,
	};

	terrainSceneStates.set(scene, state);

	if (!scene.isDisposed) {
		scene.onDisposeObservable.addOnce(() => {
			try {
				disposeTerrainSceneState(scene, state);
			} catch (e) {
				Logger.Warn(`[Terrain] Can't release the terrain resources of the scene: ${describeTerrainError(e)}`);
			}
		});
	}

	return state;
}

function tickTerrainDisposals(scene: Scene, state: ITerrainSceneState): void {
	const due: ITerrainDeferredDisposal[] = [];
	state.disposals.forEach((disposal) => {
		if (--disposal.frames <= 0) {
			due.push(disposal);
		}
	});

	if (due.length) {
		const remaining = state.disposals.filter((disposal) => !due.includes(disposal));
		state.disposals.splice(0, state.disposals.length, ...remaining);
	}

	if (!state.disposals.length && state.disposalObserver) {
		scene.onAfterRenderObservable.remove(state.disposalObserver);
		state.disposalObserver = null;
	}

	due.forEach((disposal) => runTerrainDisposal(disposal.dispose));
}

/**
 * Disposes a resource after TERRAIN_DEFERRED_DISPOSAL_FRAMES rendered frames of its scene (immediately when the scene is disposed):
 * the material context of a still-drawing effect may reference it until the next bindForSubMesh (§5.2.3).
 */
function disposeTerrainResourceLater(scene: Scene, dispose: () => void): void {
	const state = getTerrainSceneState(scene);
	if (state.disposed || scene.isDisposed) {
		runTerrainDisposal(dispose);
		return;
	}

	state.disposals.push({ frames: TERRAIN_DEFERRED_DISPOSAL_FRAMES, dispose });

	state.disposalObserver ??= scene.onAfterRenderObservable.add(() => {
		try {
			tickTerrainDisposals(scene, state);
		} catch (e) {
			Logger.Warn(`[Terrain] Deferred disposal failed: ${describeTerrainError(e)}`);
		}
	});
}

function createTerrainFallbackTexture(scene: Scene, texel: readonly number[], name: string): RawTexture {
	const texture = new RawTexture(
		new Uint8Array(texel),
		1,
		1,
		Constants.TEXTUREFORMAT_RGBA,
		scene,
		false,
		false,
		Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		Constants.TEXTURETYPE_UNSIGNED_BYTE
	);
	texture.name = name;
	texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
	texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
	return texture;
}

/**
 * Typed per-scene fallbacks, created lazily through TerrainMaterialPlugin.Gpu and disposed with the scene (§5.2.3).
 * On engines without a GPU context (or without terrain support) every fallback is null: setTexture(name, null) is harmless there.
 * Called by isReadyForSubMesh only, never while a material binds its textures: on WebGL, creating a texture binds it to the active
 * texture unit then unbinds it, which removes the texture the material had just bound there for its draw call.
 */
function ensureTerrainFallbacks(scene: Scene): ITerrainSceneFallbacks | null {
	const state = getTerrainSceneState(scene);
	if (state.disposed) {
		return null;
	}

	const gpu = TerrainMaterialPlugin.Gpu;
	if (state.fallbacks?.gpu === gpu) {
		return state.fallbacks;
	}

	const previous = state.fallbacks;
	if (previous) {
		disposeTerrainResourceLater(scene, () => disposeTerrainFallbacks(previous));
	}

	const fallbacks: ITerrainSceneFallbacks = { gpu, weights0: null, zero: null, albedoArray: null, normalArray: null };
	state.fallbacks = fallbacks;

	const engine = scene.getEngine();
	if (!isTerrainEngineSupported(engine) || !isTerrainGpuAvailable(gpu, engine)) {
		return fallbacks;
	}

	try {
		fallbacks.weights0 = createTerrainFallbackTexture(scene, [255, 0, 0, 0], "TerrainWeightsFallback");
		fallbacks.zero = createTerrainFallbackTexture(scene, [0, 0, 0, 0], "TerrainZeroWeightsFallback");
		fallbacks.albedoArray = gpu.createLayerArray(new Uint8Array([255, 255, 255, 128]), 1, 1, scene, "TerrainAlbedoArrayFallback", 1);
		fallbacks.normalArray = gpu.createLayerArray(new Uint8Array([128, 128, 255, 255]), 1, 1, scene, "TerrainNormalArrayFallback", 1);
	} catch (e) {
		logTerrainWarningOnce(`[Terrain] Can't create the terrain fallback textures: ${describeTerrainError(e)}`);
	}

	return fallbacks;
}

/** The per-scene fallbacks created by ensureTerrainFallbacks, or null. Never creates anything (safe while binding). */
function peekTerrainFallbacks(scene: Scene): ITerrainSceneFallbacks | null {
	const state = terrainSceneStates.get(scene);
	return state && !state.disposed ? state.fallbacks : null;
}

function getTerrainCachedImage(state: ITerrainSceneState, key: string): ITerrainDecodedImage | null {
	const image = state.images.get(key);
	if (!image) {
		return null;
	}

	// Most recently used last.
	state.images.delete(key);
	state.images.set(key, image);

	return image;
}

function setTerrainCachedImage(state: ITerrainSceneState, key: string, image: ITerrainDecodedImage): void {
	state.images.delete(key);
	state.images.set(key, image);

	while (state.images.size > TERRAIN_DECODED_IMAGE_CACHE_SIZE) {
		const oldest = state.images.keys().next();
		if (oldest.done) {
			break;
		}

		state.images.delete(oldest.value);
	}
}

function evictTerrainSourceImages(state: ITerrainSceneState, request: ITerrainLayerArrayRequest): void {
	const prefixes = getTerrainLayerSourcePaths(request.layers).map((path) => `${request.rootUrl}${resolveTerrainDataPath(path)}|`);
	Array.from(state.images.keys()).forEach((key) => {
		if (prefixes.some((prefix) => key.startsWith(prefix))) {
			state.images.delete(key);
		}
	});
}

async function runTerrainTasksAsync<T>(items: readonly T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
	let next = 0;

	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const item = items[next++];
			await task(item);
		}
	};

	const workers: Promise<void>[] = [];
	for (let i = 0; i < Math.min(concurrency, items.length); ++i) {
		workers.push(worker());
	}

	await Promise.all(workers);
}

/** Validates a decoded source and resizes it to size × size when the decoder returned another size. null when unusable. */
function normalizeTerrainDecodedImage(image: ITerrainDecodedImage | null, size: number): ITerrainDecodedImage | null {
	if (!image || !(image.width > 0) || !(image.height > 0) || image.data?.length !== image.width * image.height * 4) {
		return null;
	}

	if (image.width === size && image.height === size) {
		return image;
	}

	try {
		const resized = resizeTerrainImage(image, size, size);
		return resized.data.length === size * size * 4 ? resized : null;
	} catch (e) {
		logTerrainWarningOnce(`[Terrain] Can't resize a layer source: ${describeTerrainError(e)}`);
		return null;
	}
}

async function decodeTerrainLayerSourceAsync(request: ITerrainLayerArrayRequest, state: ITerrainSceneState, path: string): Promise<ITerrainDecodedImage | null> {
	const url = `${request.rootUrl}${resolveTerrainDataPath(path)}`;
	const exact = isTerrainSourceAlphaData(request.layers, path);

	const cacheKey = `${url}|${request.size}|${exact}`;
	const cached = getTerrainCachedImage(state, cacheKey);
	if (cached) {
		return cached;
	}

	let image: ITerrainDecodedImage | null = null;
	try {
		image = normalizeTerrainDecodedImage(await TerrainMaterialPlugin.ImageDecoder.decode(url, request.size, request.size, request.scene, { exact }), request.size);
	} catch (e) {
		image = null;
	}

	if (image) {
		setTerrainCachedImage(state, cacheKey, image);
	}

	return image;
}

/** Decodes the sources, packs them (§5.5.2) and creates the arrays through TerrainMaterialPlugin.Gpu (§5.5.3). Returned with refs = 0. */
async function buildTerrainLayerArraysAsync(request: ITerrainLayerArrayRequest, state: ITerrainSceneState, epoch: number): Promise<ITerrainLayerArrayEntry> {
	const paths = getTerrainLayerSourcePaths(request.layers);
	const images = new Map<string, ITerrainDecodedImage>();

	await runTerrainTasksAsync(paths, TERRAIN_DECODE_CONCURRENCY, async (path) => {
		const image = await decodeTerrainLayerSourceAsync(request, state, path);
		if (image) {
			images.set(path, image);
		}
	});

	const failedPaths = paths.filter((path) => !images.has(path));
	const packed = packTerrainLayerArrays(request.layers, images, request.size);

	if (!TerrainMaterialPlugin.KeepDecodedSources) {
		state.images.clear();
	}

	const scene = request.scene;
	if (state.disposed || scene.isDisposed) {
		return {
			key: request.key,
			scene,
			albedo: null,
			normal: null,
			level0Albedo: null,
			level0Normal: null,
			failedPaths,
			error: "the scene was disposed",
			epoch,
			refs: 0,
			disposed: true,
		};
	}

	const gpu = TerrainMaterialPlugin.Gpu;
	const layerCount = packed.layers;

	let error: string | null = null;
	let albedo: RawTexture2DArray | null = null;
	let normal: RawTexture2DArray | null = null;

	try {
		if (packed.hasAlbedo) {
			albedo = gpu.createLayerArray(packed.albedo, packed.size, layerCount, scene, "TerrainAlbedoArray", request.anisotropy);
			if (!albedo) {
				error = "the albedo texture array couldn't be created";
			}
		}

		if (packed.normal) {
			normal = gpu.createLayerArray(packed.normal, packed.size, layerCount, scene, "TerrainNormalArray", request.anisotropy);
			if (!normal) {
				error ??= "the normal texture array couldn't be created";
			}
		}
	} catch (e) {
		albedo?.dispose();
		normal?.dispose();
		throw e;
	}

	const keepLevel0 = !scene.getEngine().doNotHandleContextLost;

	return {
		key: request.key,
		scene,
		albedo,
		normal,
		level0Albedo: keepLevel0 && albedo ? packed.albedo : null,
		level0Normal: keepLevel0 && normal ? packed.normal : null,
		failedPaths,
		error,
		epoch,
		refs: 0,
		disposed: false,
	};
}

/**
 * Acquires (refs++) the cache entry of request.key, building it when missing (§5.5.1).
 * A forced request (rebuildLayerTextures) only accepts an entry or a build in flight at least as recent as its call (epoch >= forceEpoch):
 * otherwise it evicts the decoded sources and builds a new entry. So the N plugins that share an entry and are rebuilt for the same file
 * change share one new build (one decode per source, one entry), and a later change still gets a fresh build.
 */
async function acquireTerrainLayerArraysAsync(request: ITerrainLayerArrayRequest): Promise<ITerrainLayerArrayEntry> {
	const state = getTerrainSceneState(request.scene);
	const minimumEpoch = request.force ? request.forceEpoch : 0;

	const cached = state.entries.get(request.key);
	if (cached && !cached.disposed && cached.epoch >= minimumEpoch) {
		++cached.refs;
		return cached;
	}

	const building = state.builds.get(request.key);
	if (building && building.epoch >= minimumEpoch) {
		const entry = await building.promise;
		if (!entry.disposed) {
			++entry.refs;
			return entry;
		}
	}

	if (request.force) {
		evictTerrainSourceImages(state, request);
	}

	const epoch = request.force ? terrainLayerForceEpoch : 0;
	const build: ITerrainLayerArrayBuild = { promise: buildTerrainLayerArraysAsync(request, state, epoch), epoch };
	state.builds.set(request.key, build);

	try {
		const entry = await build.promise;

		// A forced build replaces the cache slot: plugins still bound to the previous entry keep it until they rebuild. A build never
		// replaces a more recent entry (a build that wasn't forced and ends after a forced one). Entries whose arrays couldn't be created
		// are not shared: the next plugin tries again.
		const current = state.entries.get(request.key);
		if (!entry.disposed && !state.disposed && !entry.error && (!current || current.disposed || current.epoch <= entry.epoch)) {
			state.entries.set(request.key, entry);
		}

		++entry.refs;
		return entry;
	} finally {
		if (state.builds.get(request.key) === build) {
			state.builds.delete(request.key);
		}
	}
}

/** refs--; an entry nobody references is disposed after 2 rendered frames unless it is acquired again meanwhile. */
function releaseTerrainLayerArrays(entry: ITerrainLayerArrayEntry): void {
	if (entry.disposed) {
		return;
	}

	entry.refs = Math.max(0, entry.refs - 1);
	if (entry.refs > 0) {
		return;
	}

	disposeTerrainResourceLater(entry.scene, () => {
		if (entry.refs === 0) {
			disposeTerrainLayerArrayEntry(entry);
		}
	});
}

function createTerrainWeightTexture(scene: Scene, map: ITerrainWeightMap, index: 0 | 1): RawTexture {
	const texture = new RawTexture(
		map.data,
		map.size,
		map.size,
		Constants.TEXTUREFORMAT_RGBA,
		scene,
		true,
		false, // invertY false: CPU row y = texel row y (S7), partial updates land exactly.
		Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
		Constants.TEXTURETYPE_UNSIGNED_BYTE
	);
	texture.name = `TerrainWeights${index}`;
	texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
	texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
	return texture;
}

function resolveTerrainWaiters(waiters: (() => void)[]): void {
	waiters.splice(0, waiters.length).forEach((resolve) => resolve());
}

/**
 * Terrain layers material plugin (§5): up to 8 layers blended by 1 or 2 RGBA8 weight maps on a PBRMaterial.
 *
 * - Defines are a function of the data, the engine and the sampler budget only (§5.2.1), never of loaded resources: the variant compiled by
 *   forceCompilation before any load is the final one.
 * - The four samplers are bound on every bindForSubMesh with the real texture or a typed per-scene fallback (§5.2.3).
 * - Resources are loaded lazily (§5.1): weight maps through the scene file loading and decodeTerrainPng (§5.6.1), layer sources through
 *   TerrainMaterialPlugin.ImageDecoder into two texture arrays shared through a per-scene cache (§5.5).
 * - Every GPU upload goes through TerrainMaterialPlugin.Gpu (§5.10).
 */
export class TerrainMaterialPlugin extends MaterialPluginBase {
	/** Decoder used for layer sources (default: BrowserTerrainImageDecoder). Tests replace it. */
	public static ImageDecoder: ITerrainImageDecoder = new BrowserTerrainImageDecoder();
	/** GPU seam (default DefaultTerrainGpu, gpu.ts): every texture upload, mip generation and array creation goes through it. Tests replace it; on headless engines the default is a no-op (§5.10). */
	public static Gpu: ITerrainGpu = DefaultTerrainGpu;
	/** Applied to every project-relative data path (weight maps and layer sources) before rootUrl is prepended. Default null (identity). The editor installs resolveRenamedAssetPath (§6.10). */
	public static PathResolver: ((path: string) => string) | null = null;
	/**
	 * When true, the CPU copy of the weight maps is kept after upload: it is needed to read them (getWeightMap) or to paint them
	 * (updateWeightMapRegion), and the editor sets true. Default false (games): the CPU copy and the engine's upload copy are released once
	 * uploaded (4 MB per 1024 × 1024 map), and maps loaded from files are loaded again when a lost WebGL context is restored.
	 */
	public static KeepWeightMapData: boolean = false;
	/** When false (default, games), the per-scene decoded-image LRU is cleared after each layer-array build; the editor sets true (§5.5.1). */
	public static KeepDecodedSources: boolean = false;

	/** Root URL prepended to every path of data (weight maps, layer sources). Set by parse(); set by the editor on created materials. */
	public rootUrl: string = "";
	/** Notified after setData/updateLayer/setWeightMapPaths. */
	public readonly onDataChangedObservable: Observable<TerrainMaterialPlugin> = new Observable<TerrainMaterialPlugin>();
	/** Notified when weight maps or layer arrays finished (re)loading, successfully or not. */
	public readonly onResourcesChangedObservable: Observable<TerrainMaterialPlugin> = new Observable<TerrainMaterialPlugin>();

	// Fields are initialized after super() returns (define semantics): the base constructor only calls isCompatible, getClassName,
	// collectDefines and getCustomCode, which use module constants only. No base member is redeclared (§5.1).

	private _data: ITerrainMaterialData = createDefaultTerrainMaterialData();
	/** Deep copy of the parsed source when its version is newer than TERRAIN_DATA_VERSION (forward compatibility, §5.7). */
	private _rawSource: Record<string, unknown> | null = null;
	/** Incremented on every data change (uniform arrays and layer-array key caches). */
	private _dataRevision: number = 0;
	private _disposed: boolean = false;

	private readonly _weightMaps: [ITerrainWeightMap | null, ITerrainWeightMap | null] = [null, null];
	private readonly _weightTextures: [RawTexture | null, RawTexture | null] = [null, null];
	private readonly _weightErrors: [string | null, string | null] = [null, null];
	/** Incremented when a map is set or loaded: a load result of an older generation is discarded. */
	private readonly _weightMapGenerations: [number, number] = [0, 0];
	private _weightMapsState: TerrainLoadState = "idle";
	private _weightLoad: ITerrainWeightLoad | null = null;
	/** true once a weight load settled or a map was set: later loads never make the material unready (§5.1). */
	private _weightsSettled: boolean = false;
	private _weightScratch: Uint8Array | null = null;
	private readonly _weightWaiters: (() => void)[] = [];

	private _layerEntry: ITerrainLayerArrayEntry | null = null;
	private _layerTexturesState: TerrainLoadState = "idle";
	private _layerError: string | null = null;
	/** true once the lazy layer loading started (render hooks or whenLayerTexturesReadyAsync). */
	private _layerStarted: boolean = false;
	/** true once a first build settled (or nothing had to be built): later builds never make the material unready (§5.1). */
	private _layerSettled: boolean = false;
	/** true from the moment a build is scheduled (debounce included) until it settles (§5.5.1 step 0). */
	private _layerPending: boolean = false;
	/**
	 * true when the running build outlived TERRAIN_LOAD_TIMEOUT_MS: it no longer holds readiness, the scene or whenLayerTexturesReadyAsync
	 * ("error" state, fallbacks bound), but it stays pending (no duplicate build) and its late result is still bound (§5.1).
	 */
	private _layerTimedOut: boolean = false;
	private _layerGeneration: number = 0;
	private _layerTimer: ReturnType<typeof setTimeout> | null = null;
	private _layerPendingToken: object | null = null;
	/** Key of the scheduled or running build. */
	private _layerScheduledKey: string | null = null;
	/** Key of the last build that failed: not rebuilt automatically until the key changes or rebuildLayerTextures() is called. */
	private _layerAttemptedKey: string | null = null;
	private _layerForce: boolean = false;
	/** terrainLayerForceEpoch of the last rebuildLayerTextures() call (sent with the forced request). */
	private _layerForceEpoch: number = 0;
	private _layerKeyCache: { revision: number; rootUrl: string; size: number; key: string } | null = null;
	private readonly _loggedSourcePaths: Set<string> = new Set<string>();
	private readonly _layerWaiters: (() => void)[] = [];
	private _contextRestoredObserver: Nullable<Observer<AbstractEngine>> = null;
	private _weightsContextRestoredObserver: Nullable<Observer<AbstractEngine>> = null;

	private _budgetInfo: ITerrainBudgetInfo = { baseSamplers: 0, terrainSamplers: 0, budget: TERRAIN_PORTABLE_SAMPLER_BUDGET, dropped: [] };
	private readonly _loggedBudgets: Set<string> = new Set<string>();

	private _debugOptions: ITerrainDebugOptions = {
		view: TerrainDebugView.None,
		activeLayer: 0,
		contourInterval: 100,
		gridSubdivisions: 0,
		opacity: 0.6,
	};

	private readonly _layerUV: Float32Array = new Float32Array(TERRAIN_MAX_LAYERS * 4);
	private readonly _layerTint: Float32Array = new Float32Array(TERRAIN_MAX_LAYERS * 4);
	private readonly _layerPBR: Float32Array = new Float32Array(TERRAIN_MAX_LAYERS * 4);
	private readonly _layerHeight: Float32Array = new Float32Array(TERRAIN_MAX_LAYERS * 4);
	private _uniformsRevision: number = -1;
	private _uniformsWidth: number = Number.NaN;
	private _uniformsDepth: number = Number.NaN;

	/** Only (material): required by Material._ParsePlugins. Priority 150, addToPluginList true, enabled at once. */
	public constructor(material: Material) {
		super(
			material,
			TERRAIN_MATERIAL_PLUGIN_NAME,
			150,
			{
				TERRAIN: false,
				TERRAIN_LAYERS: 0,
				TERRAIN_WEIGHTS1: false,
				TERRAIN_ALBEDO: false,
				TERRAIN_NORMALS: false,
				TERRAIN_HEIGHTBLEND: false,
				TERRAIN_DEBUG: 0,
			},
			true,
			true
		);
	}

	public get data(): Readonly<ITerrainMaterialData> {
		return this._data;
	}

	/** Replaces all data (deep-copied). Uniforms update at once; layer arrays rebuild when sources/size/count/order changed; weight maps are never reloaded while CPU data exists. */
	public setData(data: ITerrainMaterialData): void {
		if (this._disposed) {
			return;
		}

		const previousDefinesKey = this._getDefinesKey();
		this._data = cloneTerrainMaterialData(data);
		this._onDataChanged(previousDefinesKey);
	}

	/** Patches one layer found by id; no-op for an unknown id. */
	public updateLayer(layerId: string, patch: Partial<Omit<ITerrainLayerData, "id">>): void {
		if (this._disposed) {
			return;
		}

		const layer = this._data.layers.find((l) => l.id === layerId);
		if (!layer) {
			return;
		}

		const previousDefinesKey = this._getDefinesKey();

		const copy = copyTerrainJson(patch ?? {}) as Partial<ITerrainLayerData>;
		delete copy.id;
		Object.assign(layer, copy);

		this._onDataChanged(previousDefinesKey);
	}

	/**
	 * Changes the serialized weight map paths only (never reloads). Newer data kept for forward compatibility (§5.7) is not dropped: only its
	 * first two weight map paths change, every other field (unknown ones included) is still written back.
	 */
	public setWeightMapPaths(paths: [string | null, string | null]): void {
		if (this._disposed) {
			return;
		}

		this._data.weightMaps = [paths[0] ?? null, paths[1] ?? null];

		const rawSource = this._rawSource;
		if (rawSource) {
			const weightMaps: unknown[] = Array.isArray(rawSource.weightMaps) ? rawSource.weightMaps.slice() : [];
			weightMaps[0] = this._data.weightMaps[0];
			weightMaps[1] = this._data.weightMaps[1];
			rawSource.weightMaps = weightMaps;
		}

		this._notifyDataChanged();
	}

	public get weightMapsState(): TerrainLoadState {
		return this._weightMapsState;
	}

	public get layerTexturesState(): TerrainLoadState {
		return this._layerTexturesState;
	}

	/** Errors of the last loads: "{path}: {reason}" per weight map that failed, then the layer-array error and the layer sources that couldn't be loaded. */
	public get lastError(): string | null {
		const errors: string[] = [];
		this._weightErrors.forEach((error) => {
			if (error) {
				errors.push(error);
			}
		});

		if (this._layerError) {
			errors.push(this._layerError);
		}

		const failedPaths = this._layerEntry?.failedPaths ?? [];
		if (failedPaths.length) {
			errors.push(`can't load ${failedPaths.join(", ")}`);
		}

		return errors.length ? errors.join("; ") : null;
	}

	public get budgetInfo(): Readonly<ITerrainBudgetInfo> {
		return this._budgetInfo;
	}

	/** Live CPU data (mutate in place, then updateWeightMapRegion). null when absent or not loaded. */
	public getWeightMap(index: 0 | 1): ITerrainWeightMap | null {
		return this._weightMaps[index] ?? null;
	}

	/** Takes ownership of map.data (no copy) and (re)creates the RawTexture; null removes the map. A replaced texture is disposed 2 rendered frames later (§5.2.3). */
	public setWeightMap(index: 0 | 1, map: ITerrainWeightMap | null): void {
		if (this._disposed) {
			return;
		}

		if (map && !(Number.isInteger(map.size) && map.size > 0 && map.data instanceof Uint8Array && map.data.length === map.size * map.size * 4)) {
			throw new Error(`[Terrain] setWeightMap: invalid weight map (size ${map.size}, ${map.data?.length} bytes): RGBA8 data of size × size × 4 bytes expected.`);
		}

		// A load of this index still in flight is discarded: the given map wins.
		++this._weightMapGenerations[index];
		this._weightErrors[index] = null;

		if (map) {
			this._applyWeightMap(index, map);
			this._weightsSettled = true;
		} else {
			this._weightMaps[index] = null;
			this._replaceWeightTexture(index, null);
		}

		const load = this._weightLoad;
		if (load?.pending.has(index)) {
			load.pending.delete(index);
			if (!load.pending.size) {
				this._settleWeightLoad(load);
			} else if (load.timedOut) {
				// The other map of a timed-out load is still awaited (the state stays "error"): lastError changed.
				this._notifyResourcesChanged();
			}
		} else if (!load && (this._weightMapsState === "idle" || this._weightMapsState === "error")) {
			// Maps created by the editor (new terrain material, §6.2 reset after a load error): "ready" once nothing failed and nothing is
			// left to load; an idle plugin with a path still to load stays idle (loaded lazily).
			const failed = this._weightErrors.some((error) => error !== null);
			const toLoad = ([0, 1] as const).some((mapIndex) => this._data.weightMaps[mapIndex] !== null && !this._hasWeightData(mapIndex));
			const state: TerrainLoadState = failed ? "error" : this._weightMapsState === "idle" && toLoad ? "idle" : "ready";

			if (state !== this._weightMapsState) {
				this._weightMapsState = state;
				this._notifyResourcesChanged();
			}
		}

		this.markAllDefinesAsDirty();
	}

	/** Uploads the inclusive-exclusive rect [x, x + width) x [y, y + height) of the CPU data (level 0, no mips) through TerrainMaterialPlugin.Gpu. */
	public updateWeightMapRegion(index: 0 | 1, x: number, y: number, width: number, height: number): void {
		const map = this._weightMaps[index];
		const texture = this._weightTextures[index];
		if (this._disposed || !map || !texture) {
			return;
		}

		const size = map.size;
		const x0 = Math.min(size, Math.max(0, Math.floor(x)));
		const y0 = Math.min(size, Math.max(0, Math.floor(y)));
		const x1 = Math.min(size, Math.max(0, Math.ceil(x + width)));
		const y1 = Math.min(size, Math.max(0, Math.ceil(y + height)));

		const regionWidth = x1 - x0;
		const regionHeight = y1 - y0;
		if (!(regionWidth > 0 && regionHeight > 0)) {
			return;
		}

		const gpu = TerrainMaterialPlugin.Gpu;
		if (!isTerrainGpuAvailable(gpu, this._getScene().getEngine())) {
			return;
		}

		const rowBytes = regionWidth * 4;
		const byteLength = rowBytes * regionHeight;

		// Packed data is mandatory (S7): full-width rects are contiguous in the CPU array, others are copied row by row.
		let packed: Uint8Array;
		if (regionWidth === size) {
			packed = map.data.subarray(y0 * size * 4, y1 * size * 4);
		} else {
			if (!this._weightScratch || this._weightScratch.length < byteLength) {
				this._weightScratch = new Uint8Array(byteLength);
			}

			packed = this._weightScratch.length === byteLength ? this._weightScratch : this._weightScratch.subarray(0, byteLength);
			for (let row = 0; row < regionHeight; ++row) {
				const start = ((y0 + row) * size + x0) * 4;
				packed.set(map.data.subarray(start, start + rowBytes), row * rowBytes);
			}
		}

		try {
			gpu.updateRegion(texture, packed, x0, y0, regionWidth, regionHeight);
		} catch (e) {
			logTerrainWarningOnce(`[Terrain] Can't upload a weight map region: ${describeTerrainError(e)}`);
		}
	}

	public generateWeightMapMipmaps(index: 0 | 1): void {
		const texture = this._weightTextures[index];
		if (this._disposed || !texture) {
			return;
		}

		const gpu = TerrainMaterialPlugin.Gpu;
		if (!isTerrainGpuAvailable(gpu, this._getScene().getEngine())) {
			return;
		}

		try {
			gpu.generateMips(texture);
		} catch (e) {
			logTerrainWarningOnce(`[Terrain] Can't generate the weight map mipmaps: ${describeTerrainError(e)}`);
		}
	}

	/** Resolves when the weight maps are loaded (or failed). Triggers the lazy load if needed (hidden terrains included: it doesn't wait for a render). */
	public whenWeightMapsReadyAsync(): Promise<void> {
		if (this._disposed) {
			return Promise.resolve();
		}

		this._ensureWeightMaps();
		if (this._weightMapsState !== "loading") {
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => this._weightWaiters.push(resolve));
	}

	/** Drops the CPU data and reloads from data.weightMaps (used after an external change, [Retry] and relink). */
	public reloadWeightMaps(): void {
		// Without a root URL nothing can be loaded: the data is kept.
		if (this._disposed || this.rootUrl === "") {
			return;
		}

		this._cancelWeightLoad();

		// Maps without a path have nothing to reload from: they keep their data. The textures of the others stay bound until the new
		// data arrives (no flicker), a failed reload falls back to layer 1 (§5.6.1).
		const indices = ([0, 1] as const).filter((index) => this._data.weightMaps[index] !== null);
		indices.forEach((index) => {
			this._weightMaps[index] = null;
			this._weightErrors[index] = null;
		});

		if (indices.length) {
			this._startWeightLoad(indices);
			return;
		}

		const changed = this._weightMapsState !== "ready";
		this._weightMapsState = "ready";
		this._weightsSettled = true;

		if (changed) {
			this._notifyResourcesChanged();
		}

		resolveTerrainWaiters(this._weightWaiters);
	}

	/**
	 * Forces a rebuild of the layer arrays (sources changed on disk). The plugins sharing this plugin's arrays and rebuilt for the same
	 * change (before this plugin's build starts) share the new arrays: one decode per source, one cache entry (§5.5.1).
	 */
	public rebuildLayerTextures(): void {
		if (this._disposed) {
			return;
		}

		this._layerForce = true;
		this._layerForceEpoch = ++terrainLayerForceEpoch;
		this._layerAttemptedKey = null;
		this._loggedSourcePaths.clear();

		if (this._layerStarted) {
			this._scheduleLayerBuild(this._getLayerKey(this._getScene()));
		}
	}

	/** Resolves when the layer arrays are built (or failed, or timed out). Triggers the lazy build if needed (hidden terrains included). */
	public whenLayerTexturesReadyAsync(): Promise<void> {
		if (this._disposed) {
			return Promise.resolve();
		}

		this._ensureLayerArrays(this._getScene());
		if (!this._layerPending || this._layerTimedOut) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve) => this._layerWaiters.push(resolve));
	}

	public get debugOptions(): Readonly<ITerrainDebugOptions> {
		return this._debugOptions;
	}

	/** Editor-only overlays; never serialized. Changing view marks defines dirty. */
	public setDebugOptions(options: Partial<ITerrainDebugOptions>): void {
		if (this._disposed || !options) {
			return;
		}

		const previousView = this._debugOptions.view;
		const next: ITerrainDebugOptions = { ...this._debugOptions };

		if (options.view !== undefined) {
			next.view = Number.isInteger(options.view) && options.view >= TerrainDebugView.None && options.view <= TerrainDebugView.Grid ? options.view : TerrainDebugView.None;
		}

		if (typeof options.activeLayer === "number" && Number.isFinite(options.activeLayer)) {
			next.activeLayer = Math.max(0, Math.round(options.activeLayer));
		}

		if (typeof options.contourInterval === "number" && Number.isFinite(options.contourInterval) && options.contourInterval > 0) {
			next.contourInterval = options.contourInterval;
		}

		if (typeof options.gridSubdivisions === "number" && Number.isFinite(options.gridSubdivisions)) {
			next.gridSubdivisions = Math.max(0, Math.round(options.gridSubdivisions));
		}

		if (typeof options.opacity === "number" && Number.isFinite(options.opacity)) {
			next.opacity = Math.min(1, Math.max(0, options.opacity));
		}

		this._debugOptions = next;

		// The view is a define (asynchronous recompile, §5.9); the other values are uniforms read by bindForSubMesh.
		if (next.view !== previousView) {
			this.markAllDefinesAsDirty();
		}
	}

	// MaterialPluginBase overrides (§5).

	public getClassName(): string {
		return TERRAIN_MATERIAL_PLUGIN_CLASS_NAME;
	}

	public isCompatible(shaderLanguage: ShaderLanguage): boolean {
		return shaderLanguage === ShaderLanguage.GLSL || shaderLanguage === ShaderLanguage.WGSL;
	}

	public prepareDefinesBeforeAttributes(defines: MaterialDefines, scene: Scene, _mesh: AbstractMesh): void {
		if (!this._isPotentiallyActive(scene)) {
			return;
		}

		// Makes PBR emit vMainUV1 even when the material has no texture of its own (runs before PrepareDefinesForAttributes, spike S3).
		defines._needUVs = true;
		defines["MAINUV1"] = true;

		this._ensureResources(scene);
	}

	public prepareDefines(defines: MaterialDefines, scene: Scene, _mesh: AbstractMesh): void {
		const budget = TERRAIN_PORTABLE_SAMPLER_BUDGET;
		const layerCount = Math.min(this._data.layers.length, TERRAIN_MAX_LAYERS);

		// May only downgrade: never enables what prepareDefinesBeforeAttributes did not (MAINUV1).
		let active = this._isPotentiallyActive(scene) && !!defines["MAINUV1"];

		const wanted = this._getWantedFeatures();
		const enabled = { ...wanted };
		const dropped: TerrainBudgetFeature[] = [];

		const base = this._estimateBaseSamplers(defines);
		const requested = 1 + (wanted.weights1 ? 1 : 0) + (wanted.albedo ? 1 : 0) + (wanted.normals ? 1 : 0);

		let count = requested;
		if (active) {
			this._ensureResources(scene);

			for (const feature of TERRAIN_BUDGET_DROP_ORDER) {
				if (base + count <= budget) {
					break;
				}

				if (enabled[feature]) {
					enabled[feature] = false;
					dropped.push(feature);
					--count;
				}
			}

			if (base + count > budget) {
				active = false;
				dropped.push("terrain");
			}

			if (dropped.length) {
				this._logBudgetExceeded(dropped, base + requested);
			}
		}

		this._setDefine(defines, "TERRAIN", active);
		this._setDefine(defines, "TERRAIN_LAYERS", active ? layerCount : 0);
		this._setDefine(defines, "TERRAIN_WEIGHTS1", active && enabled.weights1);
		this._setDefine(defines, "TERRAIN_ALBEDO", active && enabled.albedo);
		this._setDefine(defines, "TERRAIN_NORMALS", active && enabled.normals);
		this._setDefine(defines, "TERRAIN_HEIGHTBLEND", active && this._data.heightBlend && layerCount > 1);
		this._setDefine(defines, "TERRAIN_DEBUG", active ? this._debugOptions.view : 0);

		this._setBudgetInfo(base, active ? count : 0, dropped);
	}

	public isReadyForSubMesh(_defines: MaterialDefines, scene: Scene, _engine: AbstractEngine, _subMesh: SubMesh): boolean {
		// The typed fallbacks bound by bindForSubMesh (active or not) are created here, before the material binds anything (a first draw
		// always goes through this full readiness pass): see ensureTerrainFallbacks.
		if (!this._disposed) {
			ensureTerrainFallbacks(scene);
		}

		// Decided from the data, not from defines.TERRAIN (Babylon calls this before prepareDefines, §0.1).
		if (!this._isPotentiallyActive(scene)) {
			return true;
		}

		this._ensureResources(scene);

		// Only a FIRST load with nothing real to bind yet makes the material unready; later reloads keep the previous textures bound.
		const weightsPending = this._weightMapsState === "loading" && !this._weightsSettled;
		const arraysPending = this._layerPending && !this._layerSettled;

		return !weightsPending && !arraysPending;
	}

	public getUniforms(shaderLanguage?: ShaderLanguage): { ubo: { name: string; size: number; type: string; arraySize?: number }[]; fragment: string } {
		return {
			ubo: [
				{ name: "terrainLayerUV", size: 4, type: "vec4", arraySize: TERRAIN_MAX_LAYERS },
				{ name: "terrainLayerTint", size: 4, type: "vec4", arraySize: TERRAIN_MAX_LAYERS },
				{ name: "terrainLayerPBR", size: 4, type: "vec4", arraySize: TERRAIN_MAX_LAYERS },
				{ name: "terrainLayerHeight", size: 4, type: "vec4", arraySize: TERRAIN_MAX_LAYERS },
				{ name: "terrainInfo", size: 4, type: "vec4" },
				{ name: "terrainDebug", size: 4, type: "vec4" },
			],
			// MANDATORY: non-UBO GLSL path = WebGL1 AND macOS Chrome/Electron WebGL2 (ThinEngine.ExceptionList "Mac OS.+Chrome"), spike S2.
			fragment: shaderLanguage === ShaderLanguage.WGSL ? "" : TERRAIN_GLSL_FRAGMENT_UNIFORMS,
		};
	}

	public getSamplers(samplers: string[]): void {
		samplers.push(...TERRAIN_SAMPLER_NAMES);
	}

	public bindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, _engine: AbstractEngine, subMesh: SubMesh): void {
		if (this._disposed) {
			return;
		}

		// Binds EVERYTHING, every time, whatever subMesh.materialDefines says: with shader hot swapping the previous effect keeps drawing
		// while the defines already hold the new values (§5.2.3). Updates for uniforms or samplers an effect doesn't declare are harmless.
		this._updateUniformArrays(subMesh);

		uniformBuffer.updateFloatArray("terrainLayerUV", this._layerUV);
		uniformBuffer.updateFloatArray("terrainLayerTint", this._layerTint);
		uniformBuffer.updateFloatArray("terrainLayerPBR", this._layerPBR);
		uniformBuffer.updateFloatArray("terrainLayerHeight", this._layerHeight);
		uniformBuffer.updateFloat4(
			"terrainInfo",
			Math.min(this._data.layers.length, TERRAIN_MAX_LAYERS),
			this._data.heightBlendTransition,
			scene._mirroredCameraPosition ? -1 : 1,
			0
		);

		const debug = this._debugOptions;
		uniformBuffer.updateFloat4("terrainDebug", debug.activeLayer, debug.contourInterval, Math.max(1, debug.gridSubdivisions), debug.opacity);

		// Never created here (see ensureTerrainFallbacks): isReadyForSubMesh created them before this sub-mesh could be drawn.
		const fallbacks = peekTerrainFallbacks(scene);
		uniformBuffer.setTexture("terrainWeights0Sampler", this._weightTextures[0] ?? fallbacks?.weights0 ?? null);
		uniformBuffer.setTexture("terrainWeights1Sampler", this._weightTextures[1] ?? fallbacks?.zero ?? null);
		uniformBuffer.setTexture("terrainAlbedoArraySampler", this._layerEntry?.albedo ?? fallbacks?.albedoArray ?? null);
		uniformBuffer.setTexture("terrainNormalArraySampler", this._layerEntry?.normal ?? fallbacks?.normalArray ?? null);
	}

	public getCustomCode(shaderType: string, shaderLanguage?: ShaderLanguage): Nullable<{ [pointName: string]: string }> {
		if (shaderType !== "fragment") {
			return null;
		}

		return shaderLanguage === ShaderLanguage.WGSL ? TERRAIN_WGSL_FRAGMENT : TERRAIN_GLSL_FRAGMENT;
	}

	/** Weight textures (not the fallbacks) and layer arrays. */
	public getActiveTextures(activeTextures: BaseTexture[]): void {
		this._getOwnTextures().forEach((texture) => activeTextures.push(texture));
	}

	public hasTexture(texture: BaseTexture): boolean {
		return !!texture && this._getOwnTextures().includes(texture);
	}

	/** Weight textures and layer arrays are private to the plugin: they are released whatever forceDisposeTextures is (§5.7). */
	public dispose(_forceDisposeTextures?: boolean): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;

		const scene = this._getScene();

		this._cancelWeightLoad();
		([0, 1] as const).forEach((index) => {
			++this._weightMapGenerations[index];
			this._weightMaps[index] = null;
			this._replaceWeightTexture(index, null);
		});

		++this._layerGeneration;
		if (this._layerTimer !== null) {
			clearTimeout(this._layerTimer);
			this._layerTimer = null;
		}

		this._layerPending = false;
		this._layerTimedOut = false;
		if (this._layerPendingToken) {
			scene.removePendingData(this._layerPendingToken);
			this._layerPendingToken = null;
		}

		this._bindLayerEntry(null);

		if (this._weightsContextRestoredObserver) {
			scene.getEngine().onContextRestoredObservable.remove(this._weightsContextRestoredObserver);
			this._weightsContextRestoredObserver = null;
		}

		resolveTerrainWaiters(this._weightWaiters);
		resolveTerrainWaiters(this._layerWaiters);

		this.onDataChangedObservable.clear();
		this.onResourcesChangedObservable.clear();
	}

	/** Data, rootUrl, weight bytes (copied) and a reference to the same layer-array cache entry; debug options are not copied (§5.7). */
	public copyTo(plugin: MaterialPluginBase): void {
		super.copyTo(plugin);

		const target = plugin as unknown as Partial<TerrainMaterialPlugin>;
		if (plugin.getClassName() !== TERRAIN_MATERIAL_PLUGIN_CLASS_NAME || typeof target.setData !== "function" || typeof target.setWeightMap !== "function") {
			return;
		}

		target.setData(cloneTerrainMaterialData(this._data));
		target.rootUrl = this.rootUrl;

		([0, 1] as const).forEach((index) => {
			const map = this._weightMaps[index];
			if (map) {
				target.setWeightMap!(index, { size: map.size, data: new Uint8Array(map.data) });
			}
		});

		// Another class version (the Play copy of the tools) only gets the public data: it builds its own arrays when rendered.
		if (plugin instanceof TerrainMaterialPlugin) {
			plugin._copyResourcesFrom(this);
		}
	}

	public serialize(): any {
		const base = super.serialize();

		// Forward compatibility: newer data is written back unchanged until it is edited (§5.7).
		if (this._rawSource) {
			return { ...copyTerrainJson(this._rawSource), ...base };
		}

		return { ...base, ...cloneTerrainMaterialData(this._data) };
	}

	/** Stores the data and the root URL only: resources load lazily (no GPU allocation here, §5.7). */
	public parse(source: any, scene: Scene, rootUrl: string): void {
		if (source && typeof source === "object") {
			super.parse(source, scene, rootUrl);
		}

		// The identity of the plugin never depends on the JSON (getTerrainMaterialPlugin looks it up by name).
		this.name = TERRAIN_MATERIAL_PLUGIN_NAME;
		this.priority = 150;

		const { data, warnings } = parseTerrainMaterialData(source);
		warnings.forEach((warning) => logTerrainWarningOnce(`[Terrain] ${warning}`));

		this._resetResources();

		this._data = data;
		this._rawSource = null;
		if (data.version > TERRAIN_DATA_VERSION) {
			try {
				this._rawSource = copyTerrainJson(source);
			} catch (e) {
				logTerrainWarningOnce(`[Terrain] Can't keep the newer terrain data: ${describeTerrainError(e)}`);
			}
		}

		this.rootUrl = rootUrl ?? "";
		++this._dataRevision;

		this.markAllDefinesAsDirty();
	}

	private _getScene(): Scene {
		return this._material.getScene();
	}

	/** data.enabled, at least one layer, textures enabled, WebGL2 or WebGPU, and a PBRMaterial (§5.2.1). */
	private _isPotentiallyActive(scene: Scene): boolean {
		if (this._disposed) {
			return false;
		}

		const data = this._data;
		if (!data.enabled || !data.layers.length || !scene.texturesEnabled) {
			return false;
		}

		return isTerrainEngineSupported(scene.getEngine()) && this._material.getClassName() === "PBRMaterial";
	}

	private _getWantedFeatures(): { weights1: boolean; albedo: boolean; normals: boolean } {
		const layers = this._data.layers.slice(0, TERRAIN_MAX_LAYERS);
		return {
			weights1: layers.length > TERRAIN_LAYERS_PER_WEIGHT_MAP,
			albedo: layers.some((layer) => !!layer.albedo || !!layer.heightMap),
			normals: layers.some((layer) => !!layer.normal || !!layer.roughnessMap || !!layer.aoMap),
		};
	}

	/** Everything the defines depend on besides the engine, the budget and the debug view. */
	private _getDefinesKey(): string {
		const wanted = this._getWantedFeatures();
		return [this._data.enabled, Math.min(this._data.layers.length, TERRAIN_MAX_LAYERS), this._data.heightBlend, wanted.albedo, wanted.normals].join("|");
	}

	private _onDataChanged(previousDefinesKey: string): void {
		this._rawSource = null;
		++this._dataRevision;

		if (this._getDefinesKey() !== previousDefinesKey) {
			this.markAllDefinesAsDirty();
		}

		if (this._layerStarted) {
			const scene = this._getScene();
			const key = this._getLayerKey(scene);
			if (!this._layerPending) {
				this._ensureLayerArrays(scene);
			} else if (key !== this._layerScheduledKey) {
				// The scheduled or running build is stale: restart the debounce with the new data.
				this._scheduleLayerBuild(key);
			}
		}

		this._notifyDataChanged();
	}

	private _notifyDataChanged(): void {
		try {
			this.onDataChangedObservable.notifyObservers(this);
		} catch (e) {
			Logger.Warn(`[Terrain] A terrain data observer failed: ${describeTerrainError(e)}`);
		}
	}

	private _notifyResourcesChanged(): void {
		try {
			this.onResourcesChangedObservable.notifyObservers(this);
		} catch (e) {
			Logger.Warn(`[Terrain] A terrain resources observer failed: ${describeTerrainError(e)}`);
		}
	}

	private _setDefine(defines: MaterialDefines, name: string, value: boolean | number): void {
		if (defines[name] === value) {
			return;
		}

		defines[name] = value;
		// Defines are also changed by budget downgrades that no data change announced: make sure the effect is rebuilt.
		if (typeof defines.markAsUnprocessed === "function") {
			defines.markAsUnprocessed();
		}
	}

	private _setBudgetInfo(baseSamplers: number, terrainSamplers: number, dropped: TerrainBudgetFeature[]): void {
		const current = this._budgetInfo;
		if (current.baseSamplers === baseSamplers && current.terrainSamplers === terrainSamplers && current.dropped.join(",") === dropped.join(",")) {
			return;
		}

		this._budgetInfo = { baseSamplers, terrainSamplers, budget: TERRAIN_PORTABLE_SAMPLER_BUDGET, dropped };
	}

	private _logBudgetExceeded(dropped: TerrainBudgetFeature[], requestedSamplers: number): void {
		const key = dropped.join(",");
		if (this._loggedBudgets.has(key)) {
			return;
		}

		this._loggedBudgets.add(key);
		Logger.Warn(`[Terrain] Sampler budget exceeded on “${this._material.name}”: ${dropped.join(", ")} disabled (${requestedSamplers}/${TERRAIN_PORTABLE_SAMPLER_BUDGET}).`);
	}

	/** estimateTerrainPbrSamplers + the samplers of the other plugins (the built-in PBR configurations and this plugin excluded, §5.2.1). */
	private _estimateBaseSamplers(defines: MaterialDefines): number {
		const maxSimultaneousLights = (this._material as unknown as { maxSimultaneousLights?: number }).maxSimultaneousLights ?? 4;
		let count = estimateTerrainPbrSamplers(defines as unknown as Record<string, unknown>, maxSimultaneousLights);

		const pluginManager: MaterialPluginManager | undefined = this._material.pluginManager;
		pluginManager?._plugins.forEach((plugin) => {
			if (plugin === this) {
				return;
			}

			try {
				const className = plugin.getClassName();
				if (className === TERRAIN_MATERIAL_PLUGIN_CLASS_NAME || TERRAIN_BUILTIN_PBR_PLUGIN_CLASS_NAMES.has(className)) {
					return;
				}

				const samplers: string[] = [];
				plugin.getSamplers(samplers);
				count += samplers.length;
			} catch (e) {
				logTerrainWarningOnce(`[Terrain] Can't count the samplers of the material plugin “${plugin.name}”: ${describeTerrainError(e)}`);
			}
		});

		return count;
	}

	/** Starts the lazy loads (non-empty rootUrl only): weight maps and layer arrays (§5.1). */
	private _ensureResources(scene: Scene): void {
		if (this._disposed || this.rootUrl === "") {
			return;
		}

		this._ensureWeightMaps();
		this._ensureLayerArrays(scene);
	}

	private _hasWeightData(index: 0 | 1): boolean {
		return !!this._weightMaps[index] || (!TerrainMaterialPlugin.KeepWeightMapData && !!this._weightTextures[index]);
	}

	/** Loads every weight map that has a path and no data yet, once (state "idle" only, §5.6.1). */
	private _ensureWeightMaps(): void {
		if (this._disposed || this._weightMapsState !== "idle" || this.rootUrl === "") {
			return;
		}

		const indices = ([0, 1] as const).filter((index) => this._data.weightMaps[index] !== null && !this._hasWeightData(index));
		if (!indices.length) {
			this._weightMapsState = "ready";
			this._weightsSettled = true;
			return;
		}

		this._startWeightLoad(indices);
	}

	private _startWeightLoad(indices: readonly (0 | 1)[]): void {
		const scene = this._getScene();
		const load: ITerrainWeightLoad = {
			token: {},
			rootUrl: this.rootUrl,
			pending: new Set(indices),
			timeout: null,
			timedOut: false,
		};

		this._weightLoad = load;
		this._weightMapsState = "loading";
		indices.forEach((index) => {
			this._weightErrors[index] = null;
		});

		scene.addPendingData(load.token);
		load.timeout = setTimeout(() => {
			try {
				this._onWeightLoadTimeout(load);
			} catch (e) {
				Logger.Warn(`[Terrain] Weight maps timeout failed: ${describeTerrainError(e)}`);
			}
		}, TERRAIN_LOAD_TIMEOUT_MS);

		indices.forEach((index) => {
			const path = this._data.weightMaps[index];
			const generation = ++this._weightMapGenerations[index];
			if (path) {
				this._loadWeightMapAsync(load, index, path, generation).catch((e) => {
					Logger.Warn(`[Terrain] Weight map loading failed: ${describeTerrainError(e)}`);
				});
			}
		});
	}

	private async _loadWeightMapAsync(load: ITerrainWeightLoad, index: 0 | 1, path: string, generation: number): Promise<void> {
		const resolvedPath = resolveTerrainDataPath(path);

		let reason: string | null = null;
		let image: ITerrainDecodedImage | null = null;

		try {
			const bytes = await this._getScene()._loadFileAsync(`${load.rootUrl}${resolvedPath}`, undefined, true, true);
			image = await decodeTerrainPng(new Uint8Array(bytes));

			if (!image) {
				reason = "unsupported or corrupt PNG";
			} else if (image.width !== image.height) {
				reason = `the image is not square (${image.width} × ${image.height})`;
			}
		} catch (e) {
			reason = describeTerrainError(e) || "the file can't be loaded";
		}

		// Superseded by setWeightMap, reloadWeightMaps, parse or dispose. A load that timed out is NOT superseded: its late maps are applied.
		if (this._disposed || load !== this._weightLoad || generation !== this._weightMapGenerations[index] || !load.pending.has(index)) {
			return;
		}

		try {
			if (reason !== null || !image) {
				this._failWeightMap(index, resolvedPath, reason ?? "unknown error");
			} else {
				this._applyWeightMap(index, { size: image.width, data: image.data });
			}
		} catch (e) {
			this._failWeightMap(index, resolvedPath, describeTerrainError(e));
		}

		load.pending.delete(index);
		if (!load.pending.size) {
			this._settleWeightLoad(load);
		} else if (load.timedOut) {
			// A map of a timed-out load arrived late while the other one is still awaited (the state stays "error"): bound at once.
			this.markAllDefinesAsDirty();
			this._notifyResourcesChanged();
		}
	}

	/**
	 * §5.1: pending ends after TERRAIN_LOAD_TIMEOUT_MS ("error" state, the maps still awaited show the fallbacks, readiness, loadScene and
	 * whenWeightMapsReadyAsync unblocked), but the load keeps running with unchanged generations: a map that arrives late (slow network) is
	 * still applied and the state becomes "ready". setWeightMap, reloadWeightMaps, parse and dispose supersede it as usual.
	 */
	private _onWeightLoadTimeout(load: ITerrainWeightLoad): void {
		if (load !== this._weightLoad || load.timedOut) {
			return;
		}

		load.timeout = null;
		load.timedOut = true;

		load.pending.forEach((index) => {
			this._failWeightMap(index, resolveTerrainDataPath(this._data.weightMaps[index] ?? ""), `timed out after ${TERRAIN_LOAD_TIMEOUT_MS / 1000} s`);
		});

		this._getScene().removePendingData(load.token);

		this._weightMapsState = "error";
		this._weightsSettled = true;

		this.markAllDefinesAsDirty();
		this._notifyResourcesChanged();

		resolveTerrainWaiters(this._weightWaiters);
	}

	/** The map stays null: the fallbacks show layer 1 everywhere (§5.6.1). */
	private _failWeightMap(index: 0 | 1, path: string, reason: string): void {
		this._weightErrors[index] = `${path}: ${reason}`;
		this._weightMaps[index] = null;
		this._replaceWeightTexture(index, null);

		Logger.Warn(`[Terrain] ${path}: can't decode the weight map (${reason}): layer 1 is shown everywhere.`);
	}

	private _applyWeightMap(index: 0 | 1, map: ITerrainWeightMap): void {
		const texture = createTerrainWeightTexture(this._getScene(), map, index);

		this._weightMaps[index] = map;
		this._weightErrors[index] = null;
		this._replaceWeightTexture(index, texture);

		if (!TerrainMaterialPlugin.KeepWeightMapData) {
			// Games: the CPU copy is released after upload, the engine copy too (nothing is kept for context restoration: the maps are
			// loaded again from their files instead).
			this._weightMaps[index] = null;
			const internalTexture = texture.getInternalTexture() as unknown as { _bufferView?: unknown } | null;
			if (internalTexture) {
				internalTexture._bufferView = null;
			}

			this._observeWeightsContextRestored();
		}
	}

	/**
	 * Weight maps whose CPU copy was released (KeepWeightMapData false) can't be uploaded again by the engine when a lost context is restored:
	 * the maps that have a file are loaded again from it. Their restored textures stay bound (empty) until the new data arrives.
	 */
	private _observeWeightsContextRestored(): void {
		if (this._disposed || this._weightsContextRestoredObserver) {
			return;
		}

		this._weightsContextRestoredObserver = this._getScene()
			.getEngine()
			.onContextRestoredObservable.add(() => {
				try {
					if (!this._disposed && ([0, 1] as const).some((index) => this._data.weightMaps[index] !== null && !this._weightMaps[index])) {
						this.reloadWeightMaps();
					}
				} catch (e) {
					Logger.Warn(`[Terrain] Can't reload the weight maps after a context loss: ${describeTerrainError(e)}`);
				}
			});
	}

	private _replaceWeightTexture(index: 0 | 1, texture: RawTexture | null): void {
		const previous = this._weightTextures[index];
		this._weightTextures[index] = texture;

		if (previous && previous !== texture) {
			disposeTerrainResourceLater(this._getScene(), () => previous.dispose());
		}
	}

	private _settleWeightLoad(load: ITerrainWeightLoad): void {
		if (load !== this._weightLoad) {
			return;
		}

		this._weightLoad = null;
		if (load.timeout !== null) {
			clearTimeout(load.timeout);
			load.timeout = null;
		}

		if (!load.timedOut) {
			this._getScene().removePendingData(load.token);
		}

		this._weightMapsState = this._weightErrors.some((error) => error !== null) ? "error" : "ready";
		this._weightsSettled = true;

		this.markAllDefinesAsDirty();
		this._notifyResourcesChanged();

		resolveTerrainWaiters(this._weightWaiters);
	}

	/** Cancels the weight load in flight (its results are discarded). */
	private _cancelWeightLoad(): void {
		const load = this._weightLoad;
		if (!load) {
			return;
		}

		this._weightLoad = null;
		if (load.timeout !== null) {
			clearTimeout(load.timeout);
			load.timeout = null;
		}

		load.pending.forEach((index) => ++this._weightMapGenerations[index]);
		load.pending.clear();

		if (!load.timedOut) {
			this._getScene().removePendingData(load.token);
		}
	}

	private _wantsLayerArrays(): boolean {
		const wanted = this._getWantedFeatures();
		return wanted.albedo || wanted.normals;
	}

	private _getLayerTextureSize(scene: Scene): number {
		try {
			return getTerrainLayerTextureSize(this._data, scene);
		} catch (e) {
			logTerrainWarningOnce(`[Terrain] Can't compute the layer texture size: ${describeTerrainError(e)}`);
			return this._data.layerTextureSize;
		}
	}

	/** Cache key of §5.5.1 step 1, memoized per data revision, root URL and size. */
	private _getLayerKey(scene: Scene): string {
		const size = this._getLayerTextureSize(scene);
		const cache = this._layerKeyCache;
		if (cache && cache.revision === this._dataRevision && cache.rootUrl === this.rootUrl && cache.size === size) {
			return cache.key;
		}

		const key = getTerrainLayerArrayCacheKey(this._data, this.rootUrl, size);

		this._layerKeyCache = { revision: this._dataRevision, rootUrl: this.rootUrl, size, key };
		return key;
	}

	/** Schedules a build when the arrays of the current data aren't bound yet (render hooks and whenLayerTexturesReadyAsync, §5.1). */
	private _ensureLayerArrays(scene: Scene): void {
		if (this._disposed || this.rootUrl === "" || this._layerPending || !this._isPotentiallyActive(scene)) {
			return;
		}

		this._layerStarted = true;

		if (!this._wantsLayerArrays()) {
			// No layer has a source: nothing is sampled, nothing to build (the arrays of removed sources are released).
			this._bindLayerEntry(null);
			this._layerTexturesState = "ready";
			this._layerError = null;
			this._layerAttemptedKey = null;
			this._layerSettled = true;
			return;
		}

		if (!isTerrainGpuAvailable(TerrainMaterialPlugin.Gpu, scene.getEngine())) {
			return;
		}

		const key = this._getLayerKey(scene);
		if (!this._layerForce && (key === this._layerEntry?.key || key === this._layerAttemptedKey)) {
			return;
		}

		this._scheduleLayerBuild(key);
	}

	/** §5.5.1 step 0: pending from the moment the (debounced) build is scheduled. */
	private _scheduleLayerBuild(key: string): void {
		const scene = this._getScene();

		// A new generation supersedes the build in flight, a timed-out one included (its late result is released when it arrives).
		const generation = ++this._layerGeneration;
		this._layerPending = true;
		this._layerTimedOut = false;
		this._layerScheduledKey = key;

		if (!this._layerPendingToken) {
			this._layerPendingToken = {};
			scene.addPendingData(this._layerPendingToken);
		}

		if (this._layerTimer !== null) {
			clearTimeout(this._layerTimer);
		}

		this._layerTimer = setTimeout(() => {
			this._layerTimer = null;
			this._buildLayerArraysAsync(generation).catch((e) => {
				Logger.Warn(`[Terrain] Layer textures build failed: ${describeTerrainError(e)}`);
			});
		}, TERRAIN_LAYER_BUILD_DEBOUNCE_MS);
	}

	private async _buildLayerArraysAsync(generation: number): Promise<void> {
		if (generation !== this._layerGeneration || this._disposed) {
			return;
		}

		const scene = this._getScene();

		if (this.rootUrl === "" || !this._isPotentiallyActive(scene) || !isTerrainGpuAvailable(TerrainMaterialPlugin.Gpu, scene.getEngine())) {
			// Nothing can be built now (material disabled, no layer...): the bound arrays stay until a build replaces them.
			this._settleLayerBuild(generation, null, false);
			return;
		}

		if (!this._wantsLayerArrays()) {
			// Every source was removed: nothing is sampled any more, the arrays are released.
			const changed = !!this._layerEntry || this._layerTexturesState !== "ready" || this._layerError !== null;
			this._bindLayerEntry(null);
			this._layerTexturesState = "ready";
			this._layerError = null;
			this._settleLayerBuild(generation, null, changed);
			return;
		}

		const key = this._getLayerKey(scene);
		const force = this._layerForce;
		if (!force && key === this._layerEntry?.key) {
			this._settleLayerBuild(generation, key, false);
			return;
		}

		this._layerForce = false;
		this._layerTexturesState = "loading";
		this._layerError = null;

		const layers = cloneTerrainMaterialData(this._data).layers.slice(0, TERRAIN_MAX_LAYERS);
		const request: ITerrainLayerArrayRequest = {
			scene,
			key,
			size: this._getLayerTextureSize(scene),
			rootUrl: this.rootUrl,
			anisotropy: this._data.anisotropy,
			layers,
			force,
			forceEpoch: this._layerForceEpoch,
		};

		const timeout = setTimeout(() => {
			try {
				this._onLayerBuildTimeout(generation);
			} catch (e) {
				Logger.Warn(`[Terrain] Layer textures timeout failed: ${describeTerrainError(e)}`);
			}
		}, TERRAIN_LOAD_TIMEOUT_MS);

		let entry: ITerrainLayerArrayEntry | null = null;
		let error: string | null = null;

		try {
			entry = await acquireTerrainLayerArraysAsync(request);
		} catch (e) {
			error = describeTerrainError(e);
		} finally {
			clearTimeout(timeout);
		}

		if (generation !== this._layerGeneration || this._disposed) {
			// Superseded (data change, rebuildLayerTextures, parse, dispose): the newer build owns the pending state. A build that only timed
			// out keeps its generation: its late result is bound below.
			if (entry) {
				releaseTerrainLayerArrays(entry);
			}
			return;
		}

		try {
			if (entry) {
				this._bindLayerEntry(entry);
				this._layerTexturesState = entry.error ? "error" : "ready";
				this._layerError = entry.error;
				this._logFailedSources(entry, layers);
			} else {
				this._layerTexturesState = "error";
				this._layerError = error ?? "the layer textures couldn't be built";
				Logger.Warn(`[Terrain] “${this._material.name}”: can't build the layer textures (${this._layerError}).`);
			}
		} finally {
			this._settleLayerBuild(generation, key, true);
		}
	}

	/**
	 * §5.1: pending ends after TERRAIN_LOAD_TIMEOUT_MS ("error" state, fallbacks bound, readiness, loadScene and whenLayerTexturesReadyAsync
	 * unblocked), but the build keeps running with an unchanged generation: its late result (slow network) is still bound and the state
	 * becomes "ready". _layerPending stays true meanwhile, so no duplicate build starts; a data change or rebuildLayerTextures() supersedes it.
	 */
	private _onLayerBuildTimeout(generation: number): void {
		if (generation !== this._layerGeneration || this._disposed || !this._layerPending || this._layerTimedOut) {
			return;
		}

		this._layerTimedOut = true;
		this._layerSettled = true;
		this._layerTexturesState = "error";
		this._layerError = `the layer textures timed out after ${TERRAIN_LOAD_TIMEOUT_MS / 1000} s`;
		Logger.Warn(`[Terrain] “${this._material.name}”: ${this._layerError}.`);

		if (this._layerPendingToken) {
			this._getScene().removePendingData(this._layerPendingToken);
			this._layerPendingToken = null;
		}

		this.markAllDefinesAsDirty();
		this._notifyResourcesChanged();

		resolveTerrainWaiters(this._layerWaiters);
	}

	/** §5.5.1 step 4: pending = false, markAllDefinesAsDirty (defines unchanged: refreshes frozen caches), notification. */
	private _settleLayerBuild(generation: number, key: string | null, changed: boolean): void {
		if (generation !== this._layerGeneration) {
			return;
		}

		this._layerPending = false;
		this._layerTimedOut = false;
		this._layerScheduledKey = null;
		this._layerSettled = true;

		if (this._layerTexturesState === "idle" || this._layerTexturesState === "loading") {
			this._layerTexturesState = this._layerError ? "error" : "ready";
		}

		// A failed key is not rebuilt at every frame (only on a data change or rebuildLayerTextures); a bound entry covers the others.
		this._layerAttemptedKey = this._layerTexturesState === "error" ? key : null;

		if (this._layerPendingToken) {
			this._getScene().removePendingData(this._layerPendingToken);
			this._layerPendingToken = null;
		}

		if (changed) {
			this.markAllDefinesAsDirty();
			this._notifyResourcesChanged();
		}

		resolveTerrainWaiters(this._layerWaiters);
	}

	/** Binds a cache entry acquired for this plugin (refs already counted) and releases the previous one (deferred disposal). */
	private _bindLayerEntry(entry: ITerrainLayerArrayEntry | null): void {
		const previous = this._layerEntry;
		this._layerEntry = entry;

		if (previous) {
			releaseTerrainLayerArrays(previous);
		}

		this._updateContextRestoredObserver();
	}

	private _logFailedSources(entry: ITerrainLayerArrayEntry, layers: readonly ITerrainLayerData[]): void {
		entry.failedPaths.forEach((path) => {
			if (this._loggedSourcePaths.has(path)) {
				return;
			}

			this._loggedSourcePaths.add(path);

			const layer = layers.find((l) => [l.albedo, l.normal, l.roughnessMap, l.aoMap, l.heightMap].includes(path));
			Logger.Warn(`[Terrain] Layer “${layer?.name ?? ""}”: can't load ${path}`);
		});
	}

	/** Re-runs the WebGPU per-layer mip fix after a context/device restore, from the cached level-0 data (§5.5.3). */
	private _updateContextRestoredObserver(): void {
		const engine = this._getScene().getEngine();
		const entry = this._layerEntry;
		const needed = !this._disposed && !!entry && (!!entry.level0Albedo || !!entry.level0Normal);

		if (needed && !this._contextRestoredObserver) {
			this._contextRestoredObserver = engine.onContextRestoredObservable.add(() => {
				try {
					this._onContextRestored();
				} catch (e) {
					Logger.Warn(`[Terrain] Can't restore the layer texture mipmaps: ${describeTerrainError(e)}`);
				}
			});
		} else if (!needed && this._contextRestoredObserver) {
			engine.onContextRestoredObservable.remove(this._contextRestoredObserver);
			this._contextRestoredObserver = null;
		}
	}

	private _onContextRestored(): void {
		const entry = this._layerEntry;
		const engine = this._getScene().getEngine();
		if (!entry || entry.disposed || !isTerrainGpuAvailable(TerrainMaterialPlugin.Gpu, engine)) {
			return;
		}

		if (entry.albedo && entry.level0Albedo) {
			generateTerrainArrayMipmapsWebGPU(engine, entry.albedo, entry.level0Albedo);
		}

		if (entry.normal && entry.level0Normal) {
			generateTerrainArrayMipmapsWebGPU(engine, entry.normal, entry.level0Normal);
		}
	}

	/** copyTo on the same class: forward-compatible raw data and the same layer-array cache entry, marked loaded (§5.7). */
	private _copyResourcesFrom(source: TerrainMaterialPlugin): void {
		if (source._rawSource) {
			this._rawSource = copyTerrainJson(source._rawSource);
		}

		const entry = source._layerEntry;
		if (this._disposed || !entry || entry.disposed || entry.scene !== this._getScene()) {
			return;
		}

		++entry.refs;
		this._bindLayerEntry(entry);

		this._layerTexturesState = source._layerTexturesState === "error" ? "error" : "ready";
		this._layerError = source._layerError;
		this._layerAttemptedKey = entry.key;
		this._layerSettled = true;
	}

	/** parse() on a plugin that already has resources: everything is released and the states go back to "idle". */
	private _resetResources(): void {
		this._cancelWeightLoad();
		([0, 1] as const).forEach((index) => {
			++this._weightMapGenerations[index];
			this._weightMaps[index] = null;
			this._weightErrors[index] = null;
			this._replaceWeightTexture(index, null);
		});

		this._weightMapsState = "idle";
		this._weightsSettled = false;

		++this._layerGeneration;
		if (this._layerTimer !== null) {
			clearTimeout(this._layerTimer);
			this._layerTimer = null;
		}

		if (this._layerPendingToken) {
			this._getScene().removePendingData(this._layerPendingToken);
			this._layerPendingToken = null;
		}

		this._bindLayerEntry(null);

		this._layerPending = false;
		this._layerTimedOut = false;
		this._layerScheduledKey = null;
		this._layerAttemptedKey = null;
		this._layerStarted = false;
		this._layerSettled = false;
		this._layerForce = false;
		this._layerTexturesState = "idle";
		this._layerError = null;
		this._loggedSourcePaths.clear();

		resolveTerrainWaiters(this._weightWaiters);
		resolveTerrainWaiters(this._layerWaiters);
	}

	private _getOwnTextures(): BaseTexture[] {
		const textures: BaseTexture[] = [];
		[this._weightTextures[0], this._weightTextures[1], this._layerEntry?.albedo ?? null, this._layerEntry?.normal ?? null].forEach((texture) => {
			if (texture) {
				textures.push(texture);
			}
		});

		return textures;
	}

	/** §5.2.2: 4 persistent Float32Array(32) rebuilt when the data or the mesh extents change. */
	private _updateUniformArrays(subMesh: SubMesh): void {
		let width = 1;
		let depth = 1;

		try {
			const boundingBox = subMesh.getMesh().getBoundingInfo().boundingBox;
			width = Math.max(boundingBox.maximum.x - boundingBox.minimum.x, TERRAIN_MIN_EXTENT);
			depth = Math.max(boundingBox.maximum.z - boundingBox.minimum.z, TERRAIN_MIN_EXTENT);
		} catch (e) {
			logTerrainWarningOnce(`[Terrain] Can't read the terrain extents: ${describeTerrainError(e)}`);
		}

		if (this._uniformsRevision === this._dataRevision && this._uniformsWidth === width && this._uniformsDepth === depth) {
			return;
		}

		this._uniformsRevision = this._dataRevision;
		this._uniformsWidth = width;
		this._uniformsDepth = depth;

		const layers = this._data.layers;
		for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
			const offset = i * 4;
			const layer = layers[i];

			if (!layer) {
				this._layerUV.set([1, 1, 0, 0], offset);
				this._layerTint.set([1, 1, 1, 1], offset);
				this._layerPBR.set([1, 0, 1, 0], offset);
				this._layerHeight.set([1, 0, 0, 0], offset);
				continue;
			}

			const tileX = Math.max(layer.tileSize[0], TERRAIN_MIN_EXTENT);
			const tileZ = Math.max(layer.tileSize[1], TERRAIN_MIN_EXTENT);
			this._layerUV.set([width / tileX, depth / tileZ, layer.tileOffset[0] / tileX, layer.tileOffset[1] / tileZ], offset);

			terrainTintColor.set(layer.tint[0], layer.tint[1], layer.tint[2]);
			terrainTintColor.toLinearSpaceToRef(terrainLinearTintColor, true);
			this._layerTint.set([terrainLinearTintColor.r, terrainLinearTintColor.g, terrainLinearTintColor.b, layer.normalStrength], offset);

			this._layerPBR.set([layer.roughness, layer.metallic, layer.aoStrength, 0], offset);
			this._layerHeight.set([layer.heightScale, layer.heightOffset, 0, 0], offset);
		}
	}
}

/** By plugin name + class name, never instanceof (the Play copy of tools may register another class). */
export function getTerrainMaterialPlugin(material: Nullable<Material> | undefined): TerrainMaterialPlugin | null {
	const pluginManager: MaterialPluginManager | undefined = material?.pluginManager;
	const plugin = pluginManager?.getPlugin(TERRAIN_MATERIAL_PLUGIN_NAME);
	if (!plugin) {
		return null;
	}

	try {
		return plugin.getClassName() === TERRAIN_MATERIAL_PLUGIN_CLASS_NAME ? (plugin as unknown as TerrainMaterialPlugin) : null;
	} catch (e) {
		return null;
	}
}

/**
 * New weight map filled with baseLayer = 255 (default 0).
 * A map holds 4 layers: channel baseLayer is filled when 0 <= baseLayer < 4, any other value gives an all-zero map (e.g. map 1 of a
 * terrain whose layer 1 covers everything).
 */
export function createTerrainWeightMap(size: number, baseLayer: number = 0): ITerrainWeightMap {
	const mapSize = Math.max(1, Math.floor(size) || 1);
	const data = new Uint8Array(mapSize * mapSize * 4);

	if (Number.isInteger(baseLayer) && baseLayer >= 0 && baseLayer < TERRAIN_LAYERS_PER_WEIGHT_MAP) {
		for (let i = baseLayer; i < data.length; i += 4) {
			data[i] = 255;
		}
	}

	return { size: mapSize, data };
}
