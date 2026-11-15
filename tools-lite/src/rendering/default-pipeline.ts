import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { ColorGradingTexture } from "./color-grading";
import { isEditorSceneContext } from "./pipeline";

import { DefaultRenderingPipeline } from "./default/pipeline";

export * from "./default/pipeline";
export * from "./default/image-processing";
export * from "./default/bloom";
export * from "./default/depth-of-field";
export * from "./default/sharpen";
export * from "./default/grain";
export * from "./default/chromatic-aberration";
export * from "./default/fxaa";
export * from "./default/glow-layer";

let defaultRenderingPipeline: DefaultRenderingPipeline | null = null;

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
	defaultRenderingPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", true, scene, [camera]);
	defaultRenderingPipeline.samples = options?.msaaSamples ?? 1;

	defaultRenderingPipeline.depthOfField.lensSize = 512;
	defaultRenderingPipeline.depthOfField.fStop = 0.25;
	defaultRenderingPipeline.depthOfField.focusDistance = 55_000;

	if (!isEditorSceneContext(scene)) {
		warnOnce("editor-scene", "the default rendering pipeline is rendered only by the scenes created using createEditorSceneContext.");
	}

	return defaultRenderingPipeline;
}

export function serializeDefaultRenderingPipeline(): any {
	if (!defaultRenderingPipeline) {
		return null;
	}

	const pipeline = defaultRenderingPipeline;
	const imageProcessing = pipeline.imageProcessing;
	const colorCurves = imageProcessing?.colorCurves;

	return {
		samples: pipeline.samples,
		fxaaEnabled: pipeline.fxaaEnabled,

		imageProcessingEnabled: pipeline.imageProcessingEnabled,
		exposure: imageProcessing?.exposure,
		contrast: imageProcessing?.contrast,
		fromLinearSpace: imageProcessing?.fromLinearSpace,
		toneMappingEnabled: imageProcessing?.toneMappingEnabled,
		toneMappingType: imageProcessing?.toneMappingType,
		ditheringEnabled: imageProcessing?.ditheringEnabled,
		ditheringIntensity: imageProcessing?.ditheringIntensity,

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

		// Since v5.0.0-alpha.9
		vignetteEnabled: imageProcessing?.vignetteEnabled,
		vignetteColor: imageProcessing
			? [imageProcessing.vignetteColor.r, imageProcessing.vignetteColor.g, imageProcessing.vignetteColor.b, imageProcessing.vignetteColor.a]
			: undefined,
		vignetteWeight: imageProcessing?.vignetteWeight,

		chromaticAberrationEnabled: pipeline.chromaticAberrationEnabled,
		aberrationAmount: pipeline.chromaticAberration.aberrationAmount,
		radialIntensity: pipeline.chromaticAberration.radialIntensity,
		direction: [pipeline.chromaticAberration.direction.x, pipeline.chromaticAberration.direction.y],
		centerPosition: [pipeline.chromaticAberration.centerPosition.x, pipeline.chromaticAberration.centerPosition.y],

		glowLayerEnabled: pipeline.glowLayerEnabled,
		glowLayerIntensity: pipeline.glowLayer?.intensity,
		glowLayerBlurKernelSize: pipeline.glowLayer?.blurKernelSize,

		// Since v5.0.0-alpha.10
		colorGradingEnabled: imageProcessing?.colorGradingEnabled,
		colorGradingTexture: imageProcessing?.colorGradingTexture?.serialize(),
		colorGradingWithGreenDepth: imageProcessing?.imageProcessingConfiguration.colorGradingWithGreenDepth,

		colorCurvesEnabled: imageProcessing?.colorCurvesEnabled,
		globalHue: colorCurves?.globalHue,
		globalDensity: colorCurves?.globalDensity,
		globalExposure: colorCurves?.globalExposure,
		globalSaturation: colorCurves?.globalSaturation,

		highlightsHue: colorCurves?.highlightsHue,
		highlightsDensity: colorCurves?.highlightsDensity,
		highlightsExposure: colorCurves?.highlightsExposure,
		highlightsSaturation: colorCurves?.highlightsSaturation,

		midtonesHue: colorCurves?.midtonesHue,
		midtonesDensity: colorCurves?.midtonesDensity,
		midtonesExposure: colorCurves?.midtonesExposure,
		midtonesSaturation: colorCurves?.midtonesSaturation,

		shadowsHue: colorCurves?.shadowsHue,
		shadowsDensity: colorCurves?.shadowsDensity,
		shadowsExposure: colorCurves?.shadowsExposure,
		shadowsSaturation: colorCurves?.shadowsSaturation,
	};
}

/**
 * Creates the color grading texture saved with the given default rendering pipeline: a `.3dl` lookup table
 * (`BABYLON.ColorGradingTexture`) or a 2D lookup texture. The given current texture is kept when it loads the same
 * lookup table.
 */
function parseColorGradingTexture(scene: SceneContext, rootUrl: string, data: any, current: ColorGradingTexture | null): ColorGradingTexture {
	const textureData = data.colorGradingTexture;

	const url = textureData.name.indexOf("://") > 0 || textureData.name.startsWith("data:") ? textureData.name : `${rootUrl}${textureData.name}`;
	const greenDepth = data.colorGradingWithGreenDepth ?? true;

	if (current && current.url === url && (!current.is2DLookupTexture || current.greenDepth === greenDepth)) {
		current.level = textureData.level ?? 1;
		return current;
	}

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
	if (imageProcessing) {
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

		if (data.colorGradingTexture?.name) {
			imageProcessing.colorGradingTexture = parseColorGradingTexture(scene, rootUrl, data, imageProcessing.colorGradingTexture);
		}

		imageProcessing.colorCurvesEnabled = data.colorCurvesEnabled ?? false;

		const colorCurves = imageProcessing.colorCurves;
		if (colorCurves) {
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
		}
	}

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
	if (pipeline.glowLayer) {
		pipeline.glowLayer.intensity = data.glowLayerIntensity ?? 1;
		pipeline.glowLayer.blurKernelSize = data.glowLayerBlurKernelSize ?? 32;
	}

	return pipeline;
}
