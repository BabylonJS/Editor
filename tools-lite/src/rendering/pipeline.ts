import {
	addTask,
	AcesToneMapping,
	BloomPostProcessTask,
	ChromaticAberrationPostProcessTask,
	createBloomPostProcessTask,
	createChromaticAberrationPostProcessTask,
	createDepthOfFieldPostProcessTask,
	createEffectRenderTask,
	createEffectWrapper,
	createGeometryRendererTask,
	createRenderTarget,
	createRenderTask,
	createSceneContext,
	createSurfaceRenderTargetTexture,
	createTaaPostProcessTask,
	createTexture3DFromPixels,
	DepthOfFieldPostProcessTask,
	EffectBindingLayout,
	EffectRenderTask,
	EffectWrapper,
	GeometryRendererTask,
	GeometryTextureType,
	getFrameGraph,
	NeutralToneMapping,
	onRenderTargetTextureResize,
	RenderTargetTextureResult,
	RenderTask,
	SceneContext,
	setEffectTexture,
	setEffectUniforms,
	setSceneImageProcessing,
	StandardToneMapping,
	SurfaceContext,
	TaaPostProcessTask,
	Task,
	Texture2D,
	Texture3D,
	ToneMapping,
} from "@babylonjs/lite";

import { getSceneData } from "../tools/scene";

import { copyFragmentWGSL, finalFragmentWGSL, finalUniformsByteLength, fullscreenVertexWGSL, imageProcessingFragmentWGSL, imageProcessingUniformsByteLength } from "./shaders";
import { _IVolumetricImageProcessing, _VolumetricLightingPasses, VolumetricLightingRenderingPipeline } from "./volumetric/pipeline";

/**
 * Defines the color curves of the image processing, with the same properties as Babylon.js `ColorCurves`.
 */
export interface IColorCurves {
	globalHue: number;
	globalDensity: number;
	globalExposure: number;
	globalSaturation: number;

	highlightsHue: number;
	highlightsDensity: number;
	highlightsExposure: number;
	highlightsSaturation: number;

	midtonesHue: number;
	midtonesDensity: number;
	midtonesExposure: number;
	midtonesSaturation: number;

	shadowsHue: number;
	shadowsDensity: number;
	shadowsExposure: number;
	shadowsSaturation: number;
}

/**
 * Defines a color grading lookup table loaded as a 3D texture (see `ColorGradingTexture`).
 */
export interface IColorGradingLookupTable {
	/**
	 * Defines the 3D texture of the lookup table, null until loaded.
	 */
	texture: Texture3D | null;
	/**
	 * Defines the number of values of the lookup table along each axis of the color cube.
	 */
	size: number;
	/**
	 * Defines the level (weight) of the color grading.
	 */
	level: number;
}

/**
 * Defines the settings of all the post-processes of the frame graph of a scene, read each frame.
 * @internal
 */
export interface _IRenderingSettings {
	imageProcessingEnabled: boolean;
	exposure: number;
	contrast: number;
	toneMappingEnabled: boolean;
	toneMappingType: number;

	vignetteEnabled: boolean;
	vignetteBlendMode: number;
	vignetteColor: number[];
	vignetteWeight: number;
	vignetteStretch: number;
	vignetteCameraFov: number;
	vignetteCenterX: number;
	vignetteCenterY: number;

	colorGradingEnabled: boolean;
	colorGradingTexture: IColorGradingLookupTable | null;

	colorCurvesEnabled: boolean;
	colorCurves: IColorCurves;

	ditheringEnabled: boolean;
	ditheringIntensity: number;

	bloomEnabled: boolean;
	bloomThreshold: number;
	bloomWeight: number;
	bloomKernel: number;
	bloomScale: number;

	sharpenEnabled: boolean;
	sharpenEdgeAmount: number;
	sharpenColorAmount: number;

	grainEnabled: boolean;
	grainIntensity: number;
	grainAnimated: boolean;

	depthOfFieldEnabled: boolean;
	depthOfFieldBlurLevel: number;
	lensSize: number;
	fStop: number;
	focusDistance: number;
	focalLength: number;

	chromaticAberrationEnabled: boolean;
	aberrationAmount: number;
	radialIntensity: number;
	direction: { x: number; y: number };
	centerPosition: { x: number; y: number };

	fxaaEnabled: boolean;

	taaEnabled: boolean;
	taaFactor: number;
	taaSamples: number;
	taaDisableOnCameraMove: boolean;
}

/**
 * Defines the post-processes that require their own tasks in the frame graph of a scene. The frame graph of a
 * Babylon Lite scene can't be changed once built: the tasks are created for the post-processes used by any camera
 * of the scene when the scene is loaded, then they are enabled or disabled each frame according to the settings.
 * @internal
 */
export interface _IRenderingStages {
	depthOfField: boolean;
	bloom: boolean;
	chromaticAberration: boolean;
	taa: boolean;
	volumetricLighting: boolean;
	depthOfFieldBlurLevel: number;
	taaSamples: number;
}

type SettingsProvider = (scene: SceneContext) => Partial<_IRenderingSettings> | null;
type VolumetricLightingProvider = (scene: SceneContext) => VolumetricLightingRenderingPipeline | null;

const editorScenes = new WeakSet<SceneContext>();
const scenesRequestedStages = new WeakMap<SceneContext, _IRenderingStages>();
const scenesRenderingChains = new WeakMap<SceneContext, _RenderingChain>();
const settingsProviders: SettingsProvider[] = [];

let volumetricLightingProvider: VolumetricLightingProvider | null = null;

/**
 * Creates a new Babylon Lite scene ready to render the editor scenes with their post-processes: the scene is created
 * without the default render task of Babylon Lite and the tools render it through their own frame graph tasks,
 * created when the scene is loaded using `loadScene` (scene render, depth of field, bloom, image processing, sharpen,
 * grain, chromatic aberration, FXAA and TAA, according to the rendering configurations saved in the editor).
 * The scenes created using `createSceneContext` of Babylon Lite are rendered without post-processes.
 * @param surface defines the surface the scene renders to (the engine itself in the common single-canvas case).
 * @returns the new scene.
 */
export function createEditorSceneContext(surface: SurfaceContext): SceneContext {
	const scene = createSceneContext(surface, { defaultRenderTask: false });
	editorScenes.add(scene);

	return scene;
}

/**
 * Returns wether or not the given scene has been created using `createEditorSceneContext`.
 * @param scene defines the reference to the scene to check.
 */
export function isEditorSceneContext(scene: SceneContext): boolean {
	return editorScenes.has(scene);
}

/**
 * @internal
 * Registers a function that returns the settings of some post-processes for a scene (default rendering pipeline, TAA, etc.).
 */
export function _registerRenderingSettingsProvider(provider: SettingsProvider): void {
	if (!settingsProviders.includes(provider)) {
		settingsProviders.push(provider);
	}
}

/**
 * @internal
 * Registers the function that returns the volumetric lighting rendering pipeline to render for a scene.
 */
export function _registerVolumetricLightingProvider(provider: VolumetricLightingProvider): void {
	volumetricLightingProvider = provider;
}

/**
 * @internal
 * Requests the given post-processes to be part of the frame graph of the given scene. Must be called before the
 * frame graph of the scene is built (see `_buildSceneRenderTasks`).
 * @returns false if the frame graph of the scene was already built and doesn't contain the requested post-processes.
 */
export function _requestRenderingStages(scene: SceneContext, stages: Partial<_IRenderingStages>): boolean {
	const chain = scenesRenderingChains.get(scene);
	if (chain) {
		return (
			(!stages.depthOfField || chain.hasDepthOfField) &&
			(!stages.bloom || chain.hasBloom) &&
			(!stages.chromaticAberration || chain.hasChromaticAberration) &&
			(!stages.taa || chain.hasTaa) &&
			(!stages.volumetricLighting || chain.hasVolumetricLighting)
		);
	}

	let requested = scenesRequestedStages.get(scene);
	if (!requested) {
		requested = { depthOfField: false, bloom: false, chromaticAberration: false, taa: false, volumetricLighting: false, depthOfFieldBlurLevel: 0, taaSamples: 8 };
		scenesRequestedStages.set(scene, requested);
	}

	requested.depthOfField ||= stages.depthOfField ?? false;
	requested.bloom ||= stages.bloom ?? false;
	requested.chromaticAberration ||= stages.chromaticAberration ?? false;
	requested.taa ||= stages.taa ?? false;
	requested.volumetricLighting ||= stages.volumetricLighting ?? false;

	if (stages.depthOfFieldBlurLevel !== undefined) {
		requested.depthOfFieldBlurLevel = Math.max(requested.depthOfFieldBlurLevel, stages.depthOfFieldBlurLevel);
	}

	if (stages.taaSamples !== undefined) {
		requested.taaSamples = stages.taaSamples;
	}

	return true;
}

/**
 * @internal
 * Returns the frame graph tasks built by the tools for the given scene, if any.
 */
export function _getSceneRenderingChain(scene: SceneContext): unknown {
	return scenesRenderingChains.get(scene) ?? null;
}

/**
 * @internal
 * Returns wether or not the frame graph tasks of the given scene have been built by the tools.
 */
export function _hasSceneRenderTasks(scene: SceneContext): boolean {
	return scenesRenderingChains.has(scene);
}

/**
 * @internal
 * Builds the frame graph tasks of the given scene when it has been created using `createEditorSceneContext`.
 * Does nothing for the other scenes (rendered by the default render task of Babylon Lite) and when the tasks are
 * already built.
 */
export function _buildSceneRenderTasks(scene: SceneContext): void {
	if (!editorScenes.has(scene) || scenesRenderingChains.has(scene)) {
		return;
	}

	const stages = scenesRequestedStages.get(scene) ?? {
		depthOfField: false,
		bloom: false,
		chromaticAberration: false,
		taa: false,
		volumetricLighting: false,
		depthOfFieldBlurLevel: 0,
		taaSamples: 8,
	};
	const chain = new _RenderingChain(scene, stages);

	scenesRenderingChains.set(scene, chain);
	scenesRequestedStages.delete(scene);

	// The frame graph of a scene already registered must be built again to include the new tasks.
	if ((scene as { _built?: boolean })._built) {
		getFrameGraph(scene).build();
	}
}

function getToneMapping(toneMappingType: number): ToneMapping {
	switch (toneMappingType) {
		case 1:
			return AcesToneMapping;
		case 2:
			return NeutralToneMapping;
		default:
			return StandardToneMapping;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function applyColorGradingSliderNonlinear(value: number): number {
	value /= 100;

	let x = Math.abs(value);
	x = Math.pow(x, 2);

	if (value < 0) {
		x *= -1;
	}

	return x * 100;
}

function fromHSBToRef(hue: number, saturation: number, brightness: number, result: number[]): void {
	let h = clamp(hue, 0, 360);
	const s = clamp(saturation / 100, 0, 1);
	const v = clamp(brightness / 100, 0, 1);

	if (s === 0) {
		result[0] = v;
		result[1] = v;
		result[2] = v;
	} else {
		h /= 60;

		const i = Math.floor(h);
		const f = h - i;
		const p = v * (1 - s);
		const q = v * (1 - s * f);
		const t = v * (1 - s * (1 - f));

		switch (i) {
			case 0:
				result[0] = v;
				result[1] = t;
				result[2] = p;
				break;
			case 1:
				result[0] = q;
				result[1] = v;
				result[2] = p;
				break;
			case 2:
				result[0] = p;
				result[1] = v;
				result[2] = t;
				break;
			case 3:
				result[0] = p;
				result[1] = q;
				result[2] = v;
				break;
			case 4:
				result[0] = t;
				result[1] = p;
				result[2] = v;
				break;
			default:
				result[0] = v;
				result[1] = p;
				result[2] = q;
				break;
		}
	}

	result[3] = 1;
}

/**
 * Same as Babylon.js `ColorCurves._getColorGradingDataToRef`.
 */
function getColorGradingData(hue: number, density: number, saturation: number, exposure: number): number[] {
	const result = [0, 0, 0, 1];

	hue = clamp(hue, 0, 360);
	density = clamp(density, -100, 100);
	saturation = clamp(saturation, -100, 100);
	exposure = clamp(exposure, -100, 100);

	density = applyColorGradingSliderNonlinear(density);
	density *= 0.5;

	exposure = applyColorGradingSliderNonlinear(exposure);

	if (density < 0) {
		density *= -1;
		hue = (hue + 180) % 360;
	}

	fromHSBToRef(hue, density, 50 + 0.25 * exposure, result);

	result[0] *= 2;
	result[1] *= 2;
	result[2] *= 2;
	result[3] = 1 + 0.01 * saturation;

	return result;
}

/**
 * Computes the uniforms of the color curves the same way Babylon.js `ColorCurves._bind` does.
 * @returns the neutral, positive and negative curves.
 */
export function _computeColorCurves(curves: IColorCurves): { neutral: number[]; positive: number[]; negative: number[] } {
	const multiply = (a: number[], b: number[]) => a.map((value, index) => value * b[index]);
	const subtract = (a: number[], b: number[]) => a.map((value, index) => value - b[index]);

	const globalCurve = getColorGradingData(curves.globalHue, curves.globalDensity, curves.globalSaturation, curves.globalExposure);
	const highlightsCurve = multiply(getColorGradingData(curves.highlightsHue, curves.highlightsDensity, curves.highlightsSaturation, curves.highlightsExposure), globalCurve);
	const midtonesCurve = multiply(getColorGradingData(curves.midtonesHue, curves.midtonesDensity, curves.midtonesSaturation, curves.midtonesExposure), globalCurve);
	const shadowsCurve = multiply(getColorGradingData(curves.shadowsHue, curves.shadowsDensity, curves.shadowsSaturation, curves.shadowsExposure), globalCurve);

	return {
		neutral: midtonesCurve,
		positive: subtract(highlightsCurve, midtonesCurve),
		negative: subtract(midtonesCurve, shadowsCurve),
	};
}

function getDefaultSettings(): _IRenderingSettings {
	return {
		imageProcessingEnabled: false,
		exposure: 1,
		contrast: 1,
		toneMappingEnabled: false,
		toneMappingType: 0,

		vignetteEnabled: false,
		vignetteBlendMode: 0,
		vignetteColor: [0, 0, 0, 0],
		vignetteWeight: 1.5,
		vignetteStretch: 0,
		vignetteCameraFov: 0.5,
		vignetteCenterX: 0,
		vignetteCenterY: 0,

		colorGradingEnabled: false,
		colorGradingTexture: null,

		colorCurvesEnabled: false,
		colorCurves: {
			globalHue: 30,
			globalDensity: 0,
			globalExposure: 0,
			globalSaturation: 0,
			highlightsHue: 30,
			highlightsDensity: 0,
			highlightsExposure: 0,
			highlightsSaturation: 0,
			midtonesHue: 30,
			midtonesDensity: 0,
			midtonesExposure: 0,
			midtonesSaturation: 0,
			shadowsHue: 30,
			shadowsDensity: 0,
			shadowsExposure: 0,
			shadowsSaturation: 0,
		},

		ditheringEnabled: false,
		ditheringIntensity: 1 / 255,

		bloomEnabled: false,
		bloomThreshold: 0.9,
		bloomWeight: 0.15,
		bloomKernel: 64,
		bloomScale: 0.5,

		sharpenEnabled: false,
		sharpenEdgeAmount: 0.3,
		sharpenColorAmount: 1,

		grainEnabled: false,
		grainIntensity: 30,
		grainAnimated: false,

		depthOfFieldEnabled: false,
		depthOfFieldBlurLevel: 0,
		lensSize: 50,
		fStop: 1.4,
		focusDistance: 2000,
		focalLength: 50,

		chromaticAberrationEnabled: false,
		aberrationAmount: 30,
		radialIntensity: 0,
		direction: { x: 0.707, y: 0.707 },
		centerPosition: { x: 0.5, y: 0.5 },

		fxaaEnabled: false,

		taaEnabled: false,
		taaFactor: 0.05,
		taaSamples: 8,
		taaDisableOnCameraMove: true,
	};
}

/**
 * Returns the settings of the post-processes of the given scene, as provided by the registered settings providers.
 * @internal
 */
export function _getRenderingSettings(scene: SceneContext): _IRenderingSettings {
	const settings = getDefaultSettings();
	settingsProviders.forEach((provider) => Object.assign(settings, provider(scene) ?? {}));

	return settings;
}

function saturate(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

/**
 * Same as the "ACESFitted" function of the Babylon.js image processing shaders.
 */
function acesFittedToneMapping(r: number, g: number, b: number): number[] {
	// Input matrix (sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT), column major.
	const x = 0.59719 * r + 0.35458 * g + 0.04823 * b;
	const y = 0.076 * r + 0.90834 * g + 0.01566 * b;
	const z = 0.0284 * r + 0.13383 * g + 0.83777 * b;

	const fit = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
	const fx = fit(x);
	const fy = fit(y);
	const fz = fit(z);

	// Output matrix (ODT_SAT => XYZ => D60_2_D65 => sRGB), column major.
	return [saturate(1.60475 * fx - 0.53108 * fy - 0.07367 * fz), saturate(-0.10208 * fx + 1.10813 * fy - 0.00605 * fz), saturate(-0.00327 * fx - 0.07276 * fy + 1.07602 * fz)];
}

/**
 * Same as the "PBRNeutralToneMapping" function of the Babylon.js image processing shaders.
 */
function pbrNeutralToneMapping(r: number, g: number, b: number): number[] {
	const startCompression = 0.8 - 0.04;
	const desaturation = 0.15;

	const x = Math.min(r, g, b);
	const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;

	let color = [r - offset, g - offset, b - offset];

	const peak = Math.max(color[0], color[1], color[2]);
	if (peak < startCompression) {
		return color;
	}

	const d = 1 - startCompression;
	const newPeak = 1 - (d * d) / (peak + d - startCompression);
	color = color.map((value) => (value * newPeak) / peak);

	const factor = 1 - 1 / (desaturation * (peak - newPeak) + 1);
	return color.map((value) => value + (newPeak - value) * factor);
}

/**
 * Returns the tone mapping the materials of Babylon Lite apply in the given scene, as the value of the "TONEMAPPING"
 * define of Babylon.js: 0 none, 1 standard, 2 ACES and 3 Khronos PBR neutral.
 * @param scene defines the reference to the scene.
 * @internal
 */
export function _getMaterialsToneMapping(scene: SceneContext): number {
	const imageProcessing = scene.imageProcessing;
	if (imageProcessing.toneMappingEnabled !== true) {
		return 0;
	}

	switch ((imageProcessing.toneMapping ?? StandardToneMapping).id) {
		case AcesToneMapping.id:
			return 2;
		case NeutralToneMapping.id:
			return 3;
		default:
			return 1;
	}
}

/**
 * Applies the image processing of Babylon.js (exposure, tone mapping, conversion to gamma space and contrast) to the
 * given linear color, as the image processing post-process of the default rendering pipeline does to the pixels of the
 * background of the scene (the materials of Babylon Lite apply it to the other pixels).
 * Same as the "applyImageProcessing" function of the Babylon.js image processing shaders.
 * @param color defines the linear color to process.
 * @param settings defines the settings of the image processing.
 * @internal
 */
export function _applyImageProcessingToColor(
	color: readonly number[],
	settings: Pick<_IRenderingSettings, "exposure" | "contrast" | "toneMappingEnabled" | "toneMappingType">
): number[] {
	let rgb = [color[0] * settings.exposure, color[1] * settings.exposure, color[2] * settings.exposure];

	if (settings.toneMappingEnabled) {
		switch (settings.toneMappingType) {
			case 1:
				rgb = acesFittedToneMapping(rgb[0], rgb[1], rgb[2]);
				break;
			case 2:
				rgb = pbrNeutralToneMapping(rgb[0], rgb[1], rgb[2]);
				break;
			default:
				rgb = rgb.map((value) => 1 - Math.pow(2, -1.590579 * value));
				break;
		}
	}

	rgb = rgb.map((value) => saturate(Math.pow(Math.max(value, 0), 1 / 2.2)));

	const contrast = settings.contrast;
	if (contrast !== 1) {
		rgb = rgb.map((value) => {
			const highContrast = value * value * (3 - 2 * value);
			return Math.max(contrast < 1 ? 0.5 + (value - 0.5) * contrast : value + (highContrast - value) * (contrast - 1), 0);
		});
	}

	return rgb;
}

const toneMappingUpdates = new WeakMap<SceneContext, Promise<void>>();
const imageProcessingWatchedScenes = new WeakSet<SceneContext>();

function applyImageProcessingSettings(scene: SceneContext): void {
	const settings = _getRenderingSettings(scene);
	const imageProcessing = scene.imageProcessing;

	const toneMappingEnabled = settings.imageProcessingEnabled && settings.toneMappingEnabled;
	const toneMapping = getToneMapping(settings.toneMappingType);

	// Exposure and contrast are read each frame by the materials.
	imageProcessing.exposure = settings.imageProcessingEnabled ? settings.exposure : 1;
	imageProcessing.contrast = settings.imageProcessingEnabled ? settings.contrast : 1;

	// The tone mapping is compiled in the shaders of the materials: they are built again when it changes.
	if (toneMappingUpdates.has(scene)) {
		return;
	}

	if (imageProcessing.toneMappingEnabled === toneMappingEnabled && (!toneMappingEnabled || (imageProcessing.toneMapping ?? StandardToneMapping).id === toneMapping.id)) {
		return;
	}

	toneMappingUpdates.set(
		scene,
		setSceneImageProcessing(scene, { toneMappingEnabled, toneMapping })
			.catch((e) => console.error(e))
			.finally(() => toneMappingUpdates.delete(scene))
	);
}

/**
 * @internal
 * Applies each frame the image processing settings (exposure, contrast and tone mapping) of the post-processes of the
 * given scene to the configuration of the scene, used by the materials of Babylon Lite. Works with any scene.
 */
export function _watchSceneImageProcessing(scene: SceneContext): void {
	if (imageProcessingWatchedScenes.has(scene)) {
		return;
	}

	imageProcessingWatchedScenes.add(scene);

	applyImageProcessingSettings(scene);
	getSceneData(scene).onBeforeRenderObservable.add(() => applyImageProcessingSettings(scene));
}

interface _IEffectPass {
	wrapper: EffectWrapper;
	task: EffectRenderTask;
	source: Texture2D | null;
}

/**
 * The frame graph tasks rendering a scene created using `createEditorSceneContext` and its post-processes, in the
 * same order as Babylon.js: volumetric lighting, depth of field, bloom, image processing (vignette, color grading, color
 * curves, dithering), sharpen, grain, chromatic aberration, FXAA and TAA. Exposure, tone mapping and contrast are applied by the materials of
 * Babylon Lite (`scene.imageProcessing`).
 * Each task the frame graph contains is enabled or disabled each frame according to the current settings: the
 * tasks reading the output of a disabled task read its input instead.
 */
class _RenderingChain {
	public readonly scene: SceneContext;

	public readonly hasDepthOfField: boolean;
	public readonly hasBloom: boolean;
	public readonly hasChromaticAberration: boolean;
	public readonly hasTaa: boolean;
	public readonly hasVolumetricLighting: boolean;

	private _sceneTarget: RenderTargetTextureResult;
	private _renderTask: RenderTask;

	// The clear color of the scene, processed as Babylon.js does when the image processing is enabled.
	private _clearColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 1 };

	private _geometryTask: GeometryRendererTask | null = null;
	private _volumetricLighting: _VolumetricLightingPasses | null = null;

	private _depthOfFieldTask: DepthOfFieldPostProcessTask | null = null;
	private _depthOfFieldTarget: RenderTargetTextureResult | null = null;
	private _depthOfFieldSelect: _IEffectPass | null = null;
	private _depthOfFieldSelectTarget: RenderTargetTextureResult | null = null;

	private _bloomTask: BloomPostProcessTask | null = null;
	private _bloomTarget: RenderTargetTextureResult | null = null;

	private _imageProcessing: _IEffectPass;
	private _imageProcessingTarget: RenderTargetTextureResult;

	// Bound when no color grading lookup table is used: the bindings of an effect can't be empty.
	private _defaultColorGradingTexture: Texture3D;
	private _colorGradingTexture: Texture3D | null = null;

	private _chromaticAberrationTask: ChromaticAberrationPostProcessTask | null = null;
	private _chromaticAberrationTarget: RenderTargetTextureResult | null = null;

	private _final: _IEffectPass;
	private _finalTarget: RenderTargetTextureResult | null = null;

	private _taaTask: TaaPostProcessTask | null = null;
	private _taaTarget: RenderTargetTextureResult | null = null;
	private _present: _IEffectPass | null = null;

	private _targets: RenderTargetTextureResult[] = [];

	private _imageProcessingUniforms = new Float32Array(imageProcessingUniformsByteLength / 4);
	private _finalUniforms = new Float32Array(finalUniformsByteLength / 4);

	private _appliedValues = new Map<string, any>();

	public constructor(scene: SceneContext, stages: _IRenderingStages) {
		this.scene = scene;

		this.hasDepthOfField = stages.depthOfField && scene.camera !== null;
		this.hasBloom = stages.bloom;
		this.hasChromaticAberration = stages.chromaticAberration;
		this.hasTaa = stages.taa;
		this.hasVolumetricLighting = stages.volumetricLighting && scene.camera !== null;

		const surface = scene.surface;
		const engine = surface.engine;
		const format = surface.format;

		// Scene
		this._sceneTarget = this._createTarget("editor-scene", true);

		const msaa = surface.msaaSamples > 1;
		const msaaTarget = msaa ? createRenderTarget({ lbl: "editor-scene-msaa", format, dFormat: "depth24plus-stencil8", samples: surface.msaaSamples, size: surface }) : null;

		this._renderTask = createRenderTask(
			{
				name: "scene",
				rt: msaaTarget ?? this._sceneTarget.rt,
				rst: msaaTarget ? this._sceneTarget.rt : undefined,
				clrColor: this._clearColor,
				clr: true,
			},
			engine,
			scene
		);

		addTask(scene, this._renderTask);

		let current = this._sceneTarget;

		// Depth of the scene, shared by the volumetric lighting and the depth of field. Half floats, like the linear depth
		// of the Babylon.js version of the volumetric lighting: the depth of field filters it, and the geometry renderer of
		// Babylon Lite blends the transparent meshes, which a 32 bits float format doesn't support.
		if (this.hasDepthOfField || this.hasVolumetricLighting) {
			this._geometryTask = createGeometryRendererTask(
				{
					name: "editor-depth",
					samples: 1,
					textureDescriptions: [{ type: GeometryTextureType.VIEW_DEPTH, format: "r16float" }],
				},
				engine,
				scene
			);

			addTask(scene, this._geometryTask);
		}

		// Volumetric lighting
		if (this.hasVolumetricLighting && this._geometryTask) {
			this._volumetricLighting = new _VolumetricLightingPasses(scene, this._sceneTarget.texture, this._geometryTask.geometryViewDepthTexture!, (task) =>
				addTask(scene, task)
			);

			this._targets.push(this._volumetricLighting.output);
			current = this._volumetricLighting.output;
		}

		// Depth of field
		if (this.hasDepthOfField && this._geometryTask) {
			this._depthOfFieldTarget = this._createTarget("editor-depth-of-field");
			this._depthOfFieldTask = createDepthOfFieldPostProcessTask(
				{
					name: "editor-depth-of-field",
					sourceTexture: current.rt,
					targetTexture: this._depthOfFieldTarget.rt,
					depthTexture: this._geometryTask.geometryViewDepthTexture!,
					depthNotNormalized: true,
					camera: scene.camera!,
					blurLevel: stages.depthOfFieldBlurLevel,
				},
				engine,
				scene
			);

			addTask(scene, this._depthOfFieldTask);

			// The bloom reads a fixed texture: when the depth of field is disabled, the selection pass copies the scene instead.
			if (this.hasBloom) {
				this._depthOfFieldSelectTarget = this._createTarget("editor-depth-of-field-select");
				this._depthOfFieldSelect = this._createEffectPass("editor-depth-of-field-select", copyFragmentWGSL, 0, this._depthOfFieldSelectTarget.rt);
				current = this._depthOfFieldSelectTarget;
			} else {
				current = this._depthOfFieldTarget;
			}
		}

		// Bloom
		if (this.hasBloom) {
			this._bloomTarget = this._createTarget("editor-bloom");
			this._bloomTask = createBloomPostProcessTask(
				{
					name: "editor-bloom",
					sourceTexture: current.rt,
					targetTexture: this._bloomTarget.rt,
					sourceSamplingMode: "linear",
				},
				engine,
				scene
			);

			addTask(scene, this._bloomTask);
		}

		// Image processing, sharpen and grain
		this._imageProcessingTarget = this._createTarget("editor-image-processing");
		this._imageProcessing = this._createEffectPass("editor-image-processing", imageProcessingFragmentWGSL, imageProcessingUniformsByteLength, this._imageProcessingTarget.rt, [
			{ name: "colorGradingTexture", binding: 3, kind: "texture", viewDimension: "3d" },
			{ name: "colorGradingSampler", binding: 4, kind: "sampler", textureBinding: "colorGradingTexture" },
		]);

		this._defaultColorGradingTexture = createTexture3DFromPixels(engine, new Uint8Array([255, 255, 255, 255]), 1, 1, 1);
		this._setColorGradingTexture(this._defaultColorGradingTexture);

		current = this._imageProcessingTarget;

		// Chromatic aberration
		if (this.hasChromaticAberration) {
			this._chromaticAberrationTarget = this._createTarget("editor-chromatic-aberration");
			this._chromaticAberrationTask = createChromaticAberrationPostProcessTask(
				{
					name: "editor-chromatic-aberration",
					sourceTexture: current.rt,
					targetTexture: this._chromaticAberrationTarget.rt,
					sourceSamplingMode: "linear",
				},
				engine,
				scene
			);

			addTask(scene, this._chromaticAberrationTask);
		}

		// FXAA (copy when disabled)
		if (this.hasTaa) {
			this._finalTarget = this._createTarget("editor-final");
		}

		this._final = this._createEffectPass("editor-final", finalFragmentWGSL, finalUniformsByteLength, this._finalTarget?.rt ?? surface.scRT);

		// TAA
		if (this.hasTaa && this._finalTarget) {
			this._taaTarget = this._createTarget("editor-taa");
			this._taaTask = createTaaPostProcessTask(
				{
					name: "editor-taa",
					sourceTexture: this._finalTarget.rt,
					targetTexture: this._taaTarget.rt,
					sourceRenderTask: this._renderTask,
					samples: stages.taaSamples,
				},
				engine,
				scene
			);

			addTask(scene, this._taaTask);

			this._present = this._createEffectPass("editor-present", copyFragmentWGSL, 0, surface.scRT);
		}

		// Apply the settings each frame
		const sceneData = getSceneData(scene);
		sceneData.onBeforeRenderObservable.add(() => this.update());

		_watchSceneImageProcessing(scene);

		this._targets.forEach((target) => {
			onRenderTargetTextureResize(target, () => this._invalidateSources());
		});

		this.update();
	}

	private _createTarget(label: string, withDepth: boolean = false): RenderTargetTextureResult {
		const surface = this.scene.surface;
		const target = createSurfaceRenderTargetTexture(surface.engine, {
			lbl: label,
			format: surface.format,
			dFormat: withDepth && surface.msaaSamples <= 1 ? "depth24plus-stencil8" : undefined,
			samples: 1,
			size: surface,
		});

		this._targets.push(target);

		return target;
	}

	private _createEffectPass(
		name: string,
		fragmentWGSL: string,
		uniformsByteLength: number,
		target: RenderTargetTextureResult["rt"],
		extraBindings: EffectBindingLayout[] = []
	): _IEffectPass {
		const engine = this.scene.surface.engine;
		const hasUniforms = uniformsByteLength > 0;

		const wrapper = createEffectWrapper(engine, {
			name,
			vertexWGSL: fullscreenVertexWGSL,
			fragmentWGSL,
			bindings: [
				...(hasUniforms
					? [
							{ name: "params", binding: 0, kind: "uniform" as const, uniformByteLength: uniformsByteLength },
							{ name: "sourceTexture", binding: 1, kind: "texture" as const },
							{ name: "sourceSampler", binding: 2, kind: "sampler" as const, textureBinding: "sourceTexture" },
						]
					: [
							{ name: "sourceTexture", binding: 0, kind: "texture" as const },
							{ name: "sourceSampler", binding: 1, kind: "sampler" as const, textureBinding: "sourceTexture" },
						]),
				...extraBindings,
			],
		});

		const task = createEffectRenderTask({ name, effect: wrapper, target, clear: false }, engine, this.scene);
		addTask(this.scene, task);

		return { wrapper, task, source: null };
	}

	private _invalidateSources(): void {
		[this._depthOfFieldSelect, this._imageProcessing, this._final, this._present].forEach((pass) => {
			if (pass) {
				pass.source = null;
			}
		});
	}

	private _setColorGradingTexture(texture: Texture3D): void {
		if (this._colorGradingTexture !== texture) {
			this._colorGradingTexture = texture;
			setEffectTexture(this._imageProcessing.wrapper, "colorGradingTexture", texture);
		}
	}

	private _setPassSource(pass: _IEffectPass | null, source: Texture2D): void {
		if (pass && pass.source !== source) {
			pass.source = source;
			setEffectTexture(pass.wrapper, "sourceTexture", source);
		}
	}

	private _hasChanged(key: string, value: any): boolean {
		const serialized = typeof value === "object" ? JSON.stringify(value) : value;
		if (this._appliedValues.get(key) === serialized) {
			return false;
		}

		this._appliedValues.set(key, serialized);
		return true;
	}

	private _setTaskEnabled(task: Task | null, enabled: boolean): void {
		if (task) {
			task.executionEnabled = enabled;
		}
	}

	/**
	 * Applies the current settings of the post-processes to the tasks of the frame graph.
	 */
	public update(): void {
		const settings = _getRenderingSettings(this.scene);

		// The uniforms of the post-processes of Babylon Lite exist once the frame graph is recorded (scene registered).
		const isRecorded = (this.scene as { _built?: boolean })._built === true;

		// Clear color: Babylon.js applies the image processing post-process to the whole image, background included.
		const clearColor = this.scene.clearColor;
		const processedClearColor = settings.imageProcessingEnabled ? _applyImageProcessingToColor([clearColor.r, clearColor.g, clearColor.b], settings) : null;

		this._clearColor.r = processedClearColor?.[0] ?? clearColor.r;
		this._clearColor.g = processedClearColor?.[1] ?? clearColor.g;
		this._clearColor.b = processedClearColor?.[2] ?? clearColor.b;
		this._clearColor.a = clearColor.a;

		// Volumetric lighting
		let sceneColor = this._sceneTarget;
		let volumetricLightingDrawn = false;

		if (this._volumetricLighting) {
			const pipeline = volumetricLightingProvider?.(this.scene) ?? null;

			// The tasks of the depth of field and of the bloom read the output of the volumetric lighting.
			const keepOutput = this.hasDepthOfField || this.hasBloom;

			if (this._volumetricLighting.update(pipeline, this._getVolumetricImageProcessing(settings), keepOutput)) {
				sceneColor = this._volumetricLighting.output;
			}

			volumetricLightingDrawn = this._volumetricLighting.isDrawing;
		}

		// Depth of field
		const depthOfFieldEnabled = this.hasDepthOfField && settings.depthOfFieldEnabled;
		this._setTaskEnabled(this._geometryTask, depthOfFieldEnabled || volumetricLightingDrawn);
		this._setTaskEnabled(this._depthOfFieldTask, depthOfFieldEnabled);

		if (isRecorded && this._depthOfFieldTask && this._hasChanged("depthOfField", [settings.lensSize, settings.fStop, settings.focusDistance, settings.focalLength])) {
			this._depthOfFieldTask.lensSize = settings.lensSize;
			this._depthOfFieldTask.fStop = settings.fStop;
			this._depthOfFieldTask.focusDistance = settings.focusDistance;
			this._depthOfFieldTask.focalLength = settings.focalLength;
			this._depthOfFieldTask.updateUniforms();
		}

		let current = depthOfFieldEnabled ? this._depthOfFieldTarget! : sceneColor;
		if (this._depthOfFieldSelect) {
			this._setPassSource(this._depthOfFieldSelect, current.texture);
			current = this._depthOfFieldSelectTarget!;
		}

		// Bloom
		const bloomEnabled = this.hasBloom && settings.bloomEnabled;
		this._setTaskEnabled(this._bloomTask, bloomEnabled);

		if (isRecorded && this._bloomTask && this._hasChanged("bloom", [settings.bloomThreshold, settings.bloomWeight, settings.bloomKernel])) {
			this._bloomTask.threshold = settings.bloomThreshold;
			this._bloomTask.weight = settings.bloomWeight;
			this._bloomTask.kernel = settings.bloomKernel;
			this._bloomTask.updateUniforms();
		}

		if (bloomEnabled) {
			current = this._bloomTarget!;
		}

		// Image processing, sharpen and grain
		this._setPassSource(this._imageProcessing, current.texture);
		this._writeImageProcessingUniforms(settings);

		current = this._imageProcessingTarget;

		// Chromatic aberration
		const chromaticAberrationEnabled = this.hasChromaticAberration && settings.chromaticAberrationEnabled;
		this._setTaskEnabled(this._chromaticAberrationTask, chromaticAberrationEnabled);

		if (
			isRecorded &&
			this._chromaticAberrationTask &&
			this._hasChanged("chromaticAberration", [settings.aberrationAmount, settings.radialIntensity, settings.direction, settings.centerPosition])
		) {
			this._chromaticAberrationTask.aberrationAmount = settings.aberrationAmount;
			this._chromaticAberrationTask.radialIntensity = settings.radialIntensity;
			// The V axis of the post-processes of Babylon Lite points down while it points up in Babylon.js.
			this._chromaticAberrationTask.direction = { x: settings.direction.x, y: -settings.direction.y };
			this._chromaticAberrationTask.centerPosition = { x: settings.centerPosition.x, y: 1 - settings.centerPosition.y };
			this._chromaticAberrationTask.updateUniforms();
		}

		if (chromaticAberrationEnabled) {
			current = this._chromaticAberrationTarget!;
		}

		// FXAA
		this._setPassSource(this._final, current.texture);

		const width = current.texture.width || 1;
		const height = current.texture.height || 1;

		this._finalUniforms[0] = 1 / width;
		this._finalUniforms[1] = 1 / height;
		this._finalUniforms[2] = settings.fxaaEnabled ? 1 : 0;
		setEffectUniforms(this._final.wrapper, this._finalUniforms);

		// TAA
		const taaEnabled = this.hasTaa && settings.taaEnabled;
		this._setTaskEnabled(this._taaTask, taaEnabled);

		if (isRecorded && this._taaTask && this._hasChanged("taa", [settings.taaFactor, settings.taaDisableOnCameraMove])) {
			this._taaTask.factor = settings.taaFactor;
			this._taaTask.disableOnCameraMove = settings.taaDisableOnCameraMove;
			this._taaTask.updateUniforms();
		}

		if (this._present) {
			this._setPassSource(this._present, taaEnabled ? this._taaTarget!.texture : this._finalTarget!.texture);
		}
	}

	/**
	 * Returns the image processing the materials of Babylon Lite apply (exposure, tone mapping and contrast), which the
	 * volumetric lighting inverts to compose the light shafts in linear space when Babylon.js applies it using a post-process.
	 */
	private _getVolumetricImageProcessing(settings: _IRenderingSettings): _IVolumetricImageProcessing {
		const imageProcessing = this.scene.imageProcessing;

		let toneMapping = 0;
		if (imageProcessing.toneMappingEnabled === true) {
			switch ((imageProcessing.toneMapping ?? StandardToneMapping).id) {
				case AcesToneMapping.id:
					toneMapping = 1;
					break;
				case NeutralToneMapping.id:
					toneMapping = 2;
					break;
				default:
					toneMapping = 3;
					break;
			}
		}

		return {
			linear: settings.imageProcessingEnabled,
			exposure: imageProcessing.exposure,
			contrast: imageProcessing.contrast,
			toneMapping,
		};
	}

	private _writeImageProcessingUniforms(settings: _IRenderingSettings): void {
		const uniforms = this._imageProcessingUniforms;
		const texture = this._imageProcessingTarget.texture;

		const width = texture.width || 1;
		const height = texture.height || 1;

		uniforms.fill(0);

		// Screen size
		uniforms[0] = width;
		uniforms[1] = height;
		uniforms[2] = 1 / width;
		uniforms[3] = 1 / height;

		const imageProcessingEnabled = settings.imageProcessingEnabled;

		// Vignette (same as Babylon.js "ImageProcessingConfiguration.bind")
		if (imageProcessingEnabled && settings.vignetteEnabled) {
			// Same as Babylon.js: "inverseHeight / inverseWidth".
			const aspectRatio = width / height;

			let vignetteScaleY = Math.tan(settings.vignetteCameraFov * 0.5);
			let vignetteScaleX = vignetteScaleY * aspectRatio;

			const vignetteScaleGeometricMean = Math.sqrt(vignetteScaleX * vignetteScaleY);
			vignetteScaleX = vignetteScaleX + (vignetteScaleGeometricMean - vignetteScaleX) * settings.vignetteStretch;
			vignetteScaleY = vignetteScaleY + (vignetteScaleGeometricMean - vignetteScaleY) * settings.vignetteStretch;

			uniforms[4] = vignetteScaleX;
			uniforms[5] = vignetteScaleY;
			uniforms[6] = -vignetteScaleX * settings.vignetteCenterX;
			uniforms[7] = -vignetteScaleY * settings.vignetteCenterY;

			uniforms[8] = settings.vignetteColor[0] ?? 0;
			uniforms[9] = settings.vignetteColor[1] ?? 0;
			uniforms[10] = settings.vignetteColor[2] ?? 0;
			uniforms[11] = -2.0 * settings.vignetteWeight;

			uniforms[24] = settings.vignetteBlendMode === 1 ? 2 : 1;
		}

		// Color grading (same as Babylon.js "ImageProcessingConfiguration.bind")
		const colorGrading = imageProcessingEnabled && settings.colorGradingEnabled ? settings.colorGradingTexture : null;

		if (colorGrading?.texture && colorGrading.size > 0) {
			this._setColorGradingTexture(colorGrading.texture);

			uniforms[36] = (colorGrading.size - 1) / colorGrading.size;
			uniforms[37] = 0.5 / colorGrading.size;
			uniforms[38] = colorGrading.size;
			uniforms[39] = colorGrading.level;
		} else {
			this._setColorGradingTexture(this._defaultColorGradingTexture);
		}

		// Color curves
		if (imageProcessingEnabled && settings.colorCurvesEnabled) {
			const curves = _computeColorCurves(settings.colorCurves);
			uniforms.set(curves.neutral, 12);
			uniforms.set(curves.positive, 16);
			uniforms.set(curves.negative, 20);

			uniforms[25] = 1;
		}

		// Dithering
		if (imageProcessingEnabled && settings.ditheringEnabled) {
			uniforms[26] = 0.5 * settings.ditheringIntensity;
		}

		// Sharpen
		if (settings.sharpenEnabled) {
			uniforms[28] = 1;
			uniforms[29] = settings.sharpenEdgeAmount;
			uniforms[30] = settings.sharpenColorAmount;
		}

		// Grain
		if (settings.grainEnabled) {
			uniforms[32] = 1;
			uniforms[33] = settings.grainIntensity;
			uniforms[34] = settings.grainAnimated ? Math.random() + 1 : 1;
		}

		// Image processing applied by the materials, inverted to apply the vignette on the linear color.
		uniforms[40] = this.scene.imageProcessing.exposure;
		uniforms[41] = this.scene.imageProcessing.contrast;
		uniforms[42] = _getMaterialsToneMapping(this.scene);

		setEffectUniforms(this._imageProcessing.wrapper, uniforms);
	}
}
