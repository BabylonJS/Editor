import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { ColorGradingTexture } from "./color-grading";
import { _registerRenderingSettingsProvider, _requestRenderingStages, _watchSceneImageProcessing, IColorCurves, isEditorSceneContext } from "./pipeline";

/**
 * Defines the image processing of the default rendering pipeline, with the same properties as the Babylon.js
 * `ImageProcessingPostProcess`. Exposure, contrast and tone mapping are applied by the Babylon Lite materials.
 */
export class DefaultRenderingPipelineImageProcessing {
	public exposure: number = 1;
	public contrast: number = 1;
	public fromLinearSpace: boolean = true;
	public toneMappingEnabled: boolean = false;
	public toneMappingType: number = 0;
	public ditheringEnabled: boolean = false;
	public ditheringIntensity: number = 1 / 255;

	public vignetteEnabled: boolean = false;
	public vignetteColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 };
	public vignetteWeight: number = 1.5;
	public vignetteStretch: number = 0;
	public vignetteCameraFov: number = 0.5;
	public vignetteCenterX: number = 0;
	public vignetteCenterY: number = 0;
	public vignetteBlendMode: number = 0;

	public colorGradingEnabled: boolean = false;
	public colorGradingTexture: ColorGradingTexture | null = null;

	public colorCurvesEnabled: boolean = false;
	public colorCurves: IColorCurves = {
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
	};

	public readonly imageProcessingConfiguration: { colorGradingWithGreenDepth: boolean } = {
		colorGradingWithGreenDepth: true,
	};
}

/**
 * Defines the default rendering pipeline of the scene, with the same properties as the Babylon.js
 * `DefaultRenderingPipeline` so it can be configured (and animated by the cinematics) the same way. The effects are
 * rendered by the frame graph tasks of the tools (see `createEditorSceneContext`): depth of field, bloom, image
 * processing (exposure, contrast, tone mapping, vignette, color grading, color curves, dithering), sharpen, grain,
 * chromatic aberration and FXAA. The glow layer is not supported by Babylon Lite.
 */
export class DefaultRenderingPipeline {
	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;
	/**
	 * Defines the reference to the scene the pipeline renders.
	 */
	public readonly scene: SceneContext;
	/**
	 * Defines the cameras the pipeline is attached to.
	 */
	public cameras: Camera[];

	/**
	 * Kept for compatibility: the MSAA of Babylon Lite is configured when creating the engine.
	 */
	public samples: number = 1;

	public fxaaEnabled: boolean = false;

	public imageProcessingEnabled: boolean = true;
	public readonly imageProcessing: DefaultRenderingPipelineImageProcessing = new DefaultRenderingPipelineImageProcessing();

	public bloomEnabled: boolean = false;
	public bloomThreshold: number = 0.9;
	public bloomWeight: number = 0.15;
	public bloomScale: number = 0.5;
	public bloomKernel: number = 64;

	public sharpenEnabled: boolean = false;
	public readonly sharpen: { edgeAmount: number; colorAmount: number } = { edgeAmount: 0.3, colorAmount: 1 };

	public grainEnabled: boolean = false;
	public readonly grain: { intensity: number; animated: boolean } = { intensity: 30, animated: false };

	public depthOfFieldEnabled: boolean = false;
	public depthOfFieldBlurLevel: number = 0;
	public readonly depthOfField: { lensSize: number; fStop: number; focusDistance: number; focalLength: number } = {
		lensSize: 50,
		fStop: 1.4,
		focusDistance: 2000,
		focalLength: 50,
	};

	public chromaticAberrationEnabled: boolean = false;
	public readonly chromaticAberration: {
		aberrationAmount: number;
		radialIntensity: number;
		direction: { x: number; y: number };
		centerPosition: { x: number; y: number };
	} = {
		aberrationAmount: 30,
		radialIntensity: 0,
		direction: { x: 0.707, y: 0.707 },
		centerPosition: { x: 0.5, y: 0.5 },
	};

	/**
	 * Kept for compatibility: Babylon Lite has no glow layer.
	 */
	public glowLayerEnabled: boolean = false;
	/**
	 * Kept for compatibility: Babylon Lite has no glow layer.
	 */
	public glowLayer: { intensity: number; blurKernelSize: number } | null = null;

	private _isDisposed: boolean = false;

	public constructor(name: string, scene: SceneContext, cameras: Camera[]) {
		this.name = name;
		this.scene = scene;
		this.cameras = cameras;
	}

	/**
	 * Returns wether or not the pipeline has been disposed.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Returns the class name of the pipeline.
	 */
	public getClassName(): string {
		return "DefaultRenderingPipeline";
	}

	/**
	 * Disposes the pipeline: its effects are disabled.
	 */
	public dispose(): void {
		this._isDisposed = true;
	}
}

let defaultRenderingPipeline: DefaultRenderingPipeline | null = null;

_registerRenderingSettingsProvider((scene) => {
	const pipeline = defaultRenderingPipeline;
	if (!pipeline || pipeline.isDisposed || pipeline.scene !== scene) {
		return null;
	}

	const imageProcessing = pipeline.imageProcessing;
	const vignetteColor = imageProcessing.vignetteColor;

	return {
		imageProcessingEnabled: pipeline.imageProcessingEnabled,
		exposure: imageProcessing.exposure,
		contrast: imageProcessing.contrast,
		toneMappingEnabled: imageProcessing.toneMappingEnabled,
		toneMappingType: imageProcessing.toneMappingType,

		vignetteEnabled: imageProcessing.vignetteEnabled,
		vignetteBlendMode: imageProcessing.vignetteBlendMode,
		vignetteColor: [vignetteColor.r, vignetteColor.g, vignetteColor.b, vignetteColor.a],
		vignetteWeight: imageProcessing.vignetteWeight,
		vignetteStretch: imageProcessing.vignetteStretch,
		vignetteCameraFov: imageProcessing.vignetteCameraFov,
		vignetteCenterX: imageProcessing.vignetteCenterX,
		vignetteCenterY: imageProcessing.vignetteCenterY,

		colorGradingEnabled: imageProcessing.colorGradingEnabled,
		colorGradingTexture: imageProcessing.colorGradingTexture,

		colorCurvesEnabled: imageProcessing.colorCurvesEnabled,
		colorCurves: imageProcessing.colorCurves,

		ditheringEnabled: imageProcessing.ditheringEnabled,
		ditheringIntensity: imageProcessing.ditheringIntensity,

		bloomEnabled: pipeline.bloomEnabled,
		bloomThreshold: pipeline.bloomThreshold,
		bloomWeight: pipeline.bloomWeight,
		bloomKernel: pipeline.bloomKernel,
		bloomScale: pipeline.bloomScale,

		sharpenEnabled: pipeline.sharpenEnabled,
		sharpenEdgeAmount: pipeline.sharpen.edgeAmount,
		sharpenColorAmount: pipeline.sharpen.colorAmount,

		grainEnabled: pipeline.grainEnabled,
		grainIntensity: pipeline.grain.intensity,
		grainAnimated: pipeline.grain.animated,

		depthOfFieldEnabled: pipeline.depthOfFieldEnabled,
		depthOfFieldBlurLevel: pipeline.depthOfFieldBlurLevel,
		lensSize: pipeline.depthOfField.lensSize,
		fStop: pipeline.depthOfField.fStop,
		focusDistance: pipeline.depthOfField.focusDistance,
		focalLength: pipeline.depthOfField.focalLength,

		chromaticAberrationEnabled: pipeline.chromaticAberrationEnabled,
		aberrationAmount: pipeline.chromaticAberration.aberrationAmount,
		radialIntensity: pipeline.chromaticAberration.radialIntensity,
		direction: pipeline.chromaticAberration.direction,
		centerPosition: pipeline.chromaticAberration.centerPosition,

		fxaaEnabled: pipeline.fxaaEnabled,
	};
});

/**
 * Defines the configuration of the default rendering pipeline per camera.
 */
export const defaultPipelineCameraConfigurations = new Map<Camera, any>();

/**
 * Returns the reference to the default rendering pipeline if exists.
 */
export function getDefaultRenderingPipeline(): DefaultRenderingPipeline | null {
	return defaultRenderingPipeline;
}

/**
 * Sets the reference to the default rendering pipeline.
 * @access editor only.
 */
export function setDefaultRenderingPipelineRef(pipeline: DefaultRenderingPipeline | null): void {
	defaultRenderingPipeline = pipeline;
}

export function disposeDefaultRenderingPipeline(): void {
	if (defaultRenderingPipeline) {
		defaultRenderingPipeline.dispose();
		defaultRenderingPipeline = null;
	}
}

export function createDefaultRenderingPipeline(scene: SceneContext, camera: Camera, options?: IRenderingOptions): DefaultRenderingPipeline {
	defaultRenderingPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", scene, [camera]);
	defaultRenderingPipeline.samples = options?.msaaSamples ?? 1;

	defaultRenderingPipeline.depthOfField.lensSize = 512;
	defaultRenderingPipeline.depthOfField.fStop = 0.25;
	defaultRenderingPipeline.depthOfField.focusDistance = 55_000;

	_watchSceneImageProcessing(scene);

	return defaultRenderingPipeline;
}

export function serializeDefaultRenderingPipeline(): any {
	if (!defaultRenderingPipeline) {
		return null;
	}

	const pipeline = defaultRenderingPipeline;
	const imageProcessing = pipeline.imageProcessing;
	const colorCurves = imageProcessing.colorCurves;

	return {
		samples: pipeline.samples,
		fxaaEnabled: pipeline.fxaaEnabled,

		imageProcessingEnabled: pipeline.imageProcessingEnabled,
		exposure: imageProcessing.exposure,
		contrast: imageProcessing.contrast,
		fromLinearSpace: imageProcessing.fromLinearSpace,
		toneMappingEnabled: imageProcessing.toneMappingEnabled,
		toneMappingType: imageProcessing.toneMappingType,
		ditheringEnabled: imageProcessing.ditheringEnabled,
		ditheringIntensity: imageProcessing.ditheringIntensity,

		bloomEnabled: pipeline.bloomEnabled,
		bloomThreshold: pipeline.bloomThreshold,
		bloomWeight: pipeline.bloomWeight,
		bloomScale: pipeline.bloomScale,
		bloomKernel: pipeline.bloomKernel,

		sharpenEnabled: pipeline.sharpenEnabled,
		sharpenEdgeAmount: pipeline.sharpen.edgeAmount,
		sharpenColorAmount: pipeline.sharpen.colorAmount,

		grainEnabled: pipeline.grainEnabled,
		grainIntensity: pipeline.grain.intensity,
		grainAnimated: pipeline.grain.animated,

		depthOfFieldEnabled: pipeline.depthOfFieldEnabled,
		depthOfFieldBlurLevel: pipeline.depthOfFieldBlurLevel,
		lensSize: pipeline.depthOfField.lensSize,
		fStop: pipeline.depthOfField.fStop,
		focusDistance: pipeline.depthOfField.focusDistance,
		focalLength: pipeline.depthOfField.focalLength,

		vignetteEnabled: imageProcessing.vignetteEnabled,
		vignetteColor: [imageProcessing.vignetteColor.r, imageProcessing.vignetteColor.g, imageProcessing.vignetteColor.b, imageProcessing.vignetteColor.a],
		vignetteWeight: imageProcessing.vignetteWeight,

		chromaticAberrationEnabled: pipeline.chromaticAberrationEnabled,
		aberrationAmount: pipeline.chromaticAberration.aberrationAmount,
		radialIntensity: pipeline.chromaticAberration.radialIntensity,
		direction: [pipeline.chromaticAberration.direction.x, pipeline.chromaticAberration.direction.y],
		centerPosition: [pipeline.chromaticAberration.centerPosition.x, pipeline.chromaticAberration.centerPosition.y],

		glowLayerEnabled: pipeline.glowLayerEnabled,
		glowLayerIntensity: pipeline.glowLayer?.intensity,
		glowLayerBlurKernelSize: pipeline.glowLayer?.blurKernelSize,

		colorGradingEnabled: imageProcessing.colorGradingEnabled,
		colorGradingTexture: imageProcessing.colorGradingTexture?.serialize() ?? null,
		colorGradingWithGreenDepth: imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth,

		colorCurvesEnabled: imageProcessing.colorCurvesEnabled,
		...colorCurves,
	};
}

/**
 * Creates the color grading texture saved with the given default rendering pipeline: a `.3dl` lookup table
 * (`BABYLON.ColorGradingTexture`) or a 2D lookup texture. The given current texture is kept when it loads the same
 * lookup table.
 */
function parseColorGradingTexture(scene: SceneContext, rootUrl: string, data: any, current: ColorGradingTexture | null): ColorGradingTexture | null {
	const textureData = data.colorGradingTexture;
	if (!textureData?.name) {
		current?.dispose();
		return null;
	}

	const url = textureData.name.indexOf("://") > 0 || textureData.name.startsWith("data:") ? textureData.name : `${rootUrl}${textureData.name}`;
	const greenDepth = data.colorGradingWithGreenDepth ?? true;

	if (current && current.url === url && (!current.is2DLookupTexture || current.greenDepth === greenDepth)) {
		current.level = textureData.level ?? 1;
		return current;
	}

	current?.dispose();

	return new ColorGradingTexture(url, scene, {
		level: textureData.level ?? 1,
		serializedData: textureData,
		invertY: textureData.invertY ?? true,
		greenDepth,
	});
}

export function parseDefaultRenderingPipeline(scene: SceneContext, camera: Camera, data: any, rootUrl: string, options?: IRenderingOptions): DefaultRenderingPipeline {
	const pipeline = defaultRenderingPipeline ?? createDefaultRenderingPipeline(scene, camera, options);
	pipeline.samples = options?.msaaSamples ?? 1;

	pipeline.fxaaEnabled = data.fxaaEnabled;

	pipeline.imageProcessingEnabled = data.imageProcessingEnabled;

	const imageProcessing = pipeline.imageProcessing;
	imageProcessing.exposure = data.exposure;
	imageProcessing.contrast = data.contrast;
	imageProcessing.fromLinearSpace = data.fromLinearSpace;
	imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
	imageProcessing.toneMappingType = data.toneMappingType;
	imageProcessing.ditheringEnabled = data.ditheringEnabled;
	imageProcessing.ditheringIntensity = data.ditheringIntensity;

	// Since v5.0.0-alpha.9
	const vignetteColor = data.vignetteColor ?? [0, 0, 0];
	imageProcessing.vignetteEnabled = data.vignetteEnabled ?? false;
	imageProcessing.vignetteColor = { r: vignetteColor[0] ?? 0, g: vignetteColor[1] ?? 0, b: vignetteColor[2] ?? 0, a: vignetteColor[3] ?? 0 };
	imageProcessing.vignetteWeight = data.vignetteWeight ?? 0.3;

	// Since v5.0.0-alpha.10
	imageProcessing.colorGradingEnabled = data.colorGradingEnabled ?? false;
	imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth = data.colorGradingWithGreenDepth ?? true;
	imageProcessing.colorGradingTexture = parseColorGradingTexture(scene, rootUrl, data, imageProcessing.colorGradingTexture);

	imageProcessing.colorCurvesEnabled = data.colorCurvesEnabled ?? false;

	const colorCurves = imageProcessing.colorCurves;
	colorCurves.globalHue = data.globalHue ?? 30;
	colorCurves.globalDensity = data.globalDensity ?? 0;
	colorCurves.globalExposure = data.globalExposure ?? 0;
	colorCurves.globalSaturation = data.globalSaturation ?? 0;

	colorCurves.highlightsHue = data.highlightsHue ?? 30;
	colorCurves.highlightsDensity = data.highlightsDensity ?? 0;
	colorCurves.highlightsExposure = data.highlightsExposure ?? 0;
	colorCurves.highlightsSaturation = data.highlightsSaturation ?? 0;

	colorCurves.midtonesHue = data.midtonesHue ?? 30;
	colorCurves.midtonesDensity = data.midtonesDensity ?? 0;
	colorCurves.midtonesExposure = data.midtonesExposure ?? 0;
	colorCurves.midtonesSaturation = data.midtonesSaturation ?? 0;

	colorCurves.shadowsHue = data.shadowsHue ?? 30;
	colorCurves.shadowsDensity = data.shadowsDensity ?? 0;
	colorCurves.shadowsExposure = data.shadowsExposure ?? 0;
	colorCurves.shadowsSaturation = data.shadowsSaturation ?? 0;

	pipeline.bloomEnabled = data.bloomEnabled;
	pipeline.bloomThreshold = data.bloomThreshold;
	pipeline.bloomWeight = data.bloomWeight;
	pipeline.bloomScale = data.bloomScale;
	pipeline.bloomKernel = data.bloomKernel;

	pipeline.sharpenEnabled = data.sharpenEnabled;
	pipeline.sharpen.edgeAmount = data.sharpenEdgeAmount;
	pipeline.sharpen.colorAmount = data.sharpenColorAmount;

	pipeline.grainEnabled = data.grainEnabled;
	pipeline.grain.intensity = data.grainIntensity;
	pipeline.grain.animated = data.grainAnimated;

	pipeline.depthOfFieldEnabled = data.depthOfFieldEnabled;
	pipeline.depthOfFieldBlurLevel = data.depthOfFieldBlurLevel;
	pipeline.depthOfField.lensSize = data.lensSize;
	pipeline.depthOfField.fStop = data.fStop;
	pipeline.depthOfField.focusDistance = data.focusDistance;
	pipeline.depthOfField.focalLength = data.focalLength;

	// Since v5.0.0-alpha.9
	const direction = data.direction ?? [0, 0];
	const centerPosition = data.centerPosition ?? [0, 0];

	pipeline.chromaticAberrationEnabled = data.chromaticAberrationEnabled ?? false;
	pipeline.chromaticAberration.aberrationAmount = data.aberrationAmount ?? 10;
	pipeline.chromaticAberration.radialIntensity = data.radialIntensity ?? 1;
	pipeline.chromaticAberration.direction = { x: direction[0], y: direction[1] };
	pipeline.chromaticAberration.centerPosition = { x: centerPosition[0], y: centerPosition[1] };

	pipeline.glowLayerEnabled = data.glowLayerEnabled ?? false;
	if (pipeline.glowLayerEnabled) {
		pipeline.glowLayer = {
			intensity: data.glowLayerIntensity ?? 1,
			blurKernelSize: data.glowLayerBlurKernelSize ?? 32,
		};

		warnOnce("glow-layer", "the glow layer of the default rendering pipeline is not supported by Babylon Lite.");
	}

	const usesFrameGraphEffects =
		pipeline.bloomEnabled || pipeline.depthOfFieldEnabled || pipeline.chromaticAberrationEnabled || pipeline.sharpenEnabled || pipeline.grainEnabled || pipeline.fxaaEnabled;

	const usesImageProcessingEffects =
		pipeline.imageProcessingEnabled &&
		(imageProcessing.vignetteEnabled || imageProcessing.colorGradingEnabled || imageProcessing.colorCurvesEnabled || imageProcessing.ditheringEnabled);

	if (!isEditorSceneContext(scene) && (usesFrameGraphEffects || usesImageProcessingEffects)) {
		warnOnce(
			"editor-scene",
			"the post-processes of the default rendering pipeline (except exposure, contrast and tone mapping) are rendered only by the scenes created using createEditorSceneContext."
		);
	}

	const available = _requestRenderingStages(scene, {
		bloom: pipeline.bloomEnabled,
		depthOfField: pipeline.depthOfFieldEnabled,
		depthOfFieldBlurLevel: pipeline.depthOfFieldBlurLevel,
		chromaticAberration: pipeline.chromaticAberrationEnabled,
	});

	if (!available) {
		warnOnce(
			"frame-graph-built",
			"some post-processes of the default rendering pipeline are not available: the frame graph of a Babylon Lite scene can't change once built (the effects must be enabled for one of the cameras when the scene is loaded)."
		);
	}

	return pipeline;
}
