import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { ColorGradingTexture } from "@babylonjs/core/Materials/Textures/colorGradingTexture";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

import { isTexture } from "../tools/guards";

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

export function createDefaultRenderingPipeline(scene: Scene, camera: Camera): DefaultRenderingPipeline {
	defaultRenderingPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", true, scene, [camera]);
	defaultRenderingPipeline.samples = 4;

	defaultRenderingPipeline.depthOfField.lensSize = 512;
	defaultRenderingPipeline.depthOfField.fStop = 0.25;
	defaultRenderingPipeline.depthOfField.focusDistance = 55_000;

	return defaultRenderingPipeline;
}

export function serializeDefaultRenderingPipeline(): any {
	if (!defaultRenderingPipeline) {
		return null;
	}

	return {
		samples: defaultRenderingPipeline.samples,
		fxaaEnabled: defaultRenderingPipeline.fxaaEnabled,

		imageProcessingEnabled: defaultRenderingPipeline.imageProcessingEnabled,
		exposure: defaultRenderingPipeline.imageProcessing?.exposure,
		contrast: defaultRenderingPipeline.imageProcessing?.contrast,
		fromLinearSpace: defaultRenderingPipeline.imageProcessing?.fromLinearSpace,
		toneMappingEnabled: defaultRenderingPipeline.imageProcessing?.toneMappingEnabled,
		toneMappingType: defaultRenderingPipeline.imageProcessing?.toneMappingType,
		ditheringEnabled: defaultRenderingPipeline.imageProcessing?.ditheringEnabled,
		ditheringIntensity: defaultRenderingPipeline.imageProcessing?.ditheringIntensity,

		bloomEnabled: defaultRenderingPipeline.bloomEnabled,
		bloomThreshold: defaultRenderingPipeline.bloomThreshold,
		bloomWeight: defaultRenderingPipeline.bloomWeight,
		bloomScale: defaultRenderingPipeline.bloomScale,
		bloomKernel: defaultRenderingPipeline.bloomKernel,

		sharpenEnabled: defaultRenderingPipeline.sharpenEnabled,
		sharpenEdgeAmount: defaultRenderingPipeline.sharpen.edgeAmount,
		sharpenColorAmount: defaultRenderingPipeline.sharpen.colorAmount,

		grainEnabled: defaultRenderingPipeline.grainEnabled,
		grainIntensity: defaultRenderingPipeline.grain.intensity,
		grainAnimated: defaultRenderingPipeline.grain.animated,

		depthOfFieldEnabled: defaultRenderingPipeline.depthOfFieldEnabled,
		depthOfFieldBlurLevel: defaultRenderingPipeline.depthOfFieldBlurLevel,
		lensSize: defaultRenderingPipeline.depthOfField.lensSize,
		fStop: defaultRenderingPipeline.depthOfField.fStop,
		focusDistance: defaultRenderingPipeline.depthOfField.focusDistance,
		focalLength: defaultRenderingPipeline.depthOfField.focalLength,

		// Since v5.0.0-alpha.9
		vignetteEnabled: defaultRenderingPipeline.imageProcessing?.vignetteEnabled,
		vignetteColor: defaultRenderingPipeline.imageProcessing?.vignetteColor.asArray(),
		vignetteWeight: defaultRenderingPipeline.imageProcessing?.vignetteWeight,

		chromaticAberrationEnabled: defaultRenderingPipeline.chromaticAberrationEnabled,
		aberrationAmount: defaultRenderingPipeline.chromaticAberration.aberrationAmount,
		radialIntensity: defaultRenderingPipeline.chromaticAberration.radialIntensity,
		direction: defaultRenderingPipeline.chromaticAberration.direction.asArray(),
		centerPosition: defaultRenderingPipeline.chromaticAberration.centerPosition.asArray(),

		glowLayerEnabled: defaultRenderingPipeline.glowLayerEnabled,
		glowLayerIntensity: defaultRenderingPipeline.glowLayer?.intensity,
		glowLayerBlurKernelSize: defaultRenderingPipeline.glowLayer?.blurKernelSize,

		// Since v5.0.0-alpha.10
		colorGradingEnabled: defaultRenderingPipeline.imageProcessing.colorGradingEnabled,
		colorGradingTexture: defaultRenderingPipeline.imageProcessing.colorGradingTexture?.serialize(),
		colorGradingWithGreenDepth: defaultRenderingPipeline.imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth,

		colorCurvesEnabled: defaultRenderingPipeline.imageProcessing.colorCurvesEnabled,
		globalHue: defaultRenderingPipeline.imageProcessing.colorCurves?.globalHue,
		globalDensity: defaultRenderingPipeline.imageProcessing.colorCurves?.globalDensity,
		globalExposure: defaultRenderingPipeline.imageProcessing.colorCurves?.globalExposure,
		globalSaturation: defaultRenderingPipeline.imageProcessing.colorCurves?.globalSaturation,

		highlightsHue: defaultRenderingPipeline.imageProcessing.colorCurves?.highlightsHue,
		highlightsDensity: defaultRenderingPipeline.imageProcessing.colorCurves?.highlightsDensity,
		highlightsExposure: defaultRenderingPipeline.imageProcessing.colorCurves?.highlightsExposure,
		highlightsSaturation: defaultRenderingPipeline.imageProcessing.colorCurves?.highlightsSaturation,

		midtonesHue: defaultRenderingPipeline.imageProcessing.colorCurves?.midtonesHue,
		midtonesDensity: defaultRenderingPipeline.imageProcessing.colorCurves?.midtonesDensity,
		midtonesExposure: defaultRenderingPipeline.imageProcessing.colorCurves?.midtonesExposure,
		midtonesSaturation: defaultRenderingPipeline.imageProcessing.colorCurves?.midtonesSaturation,

		shadowsHue: defaultRenderingPipeline.imageProcessing.colorCurves?.shadowsHue,
		shadowsDensity: defaultRenderingPipeline.imageProcessing.colorCurves?.shadowsDensity,
		shadowsExposure: defaultRenderingPipeline.imageProcessing.colorCurves?.shadowsExposure,
		shadowsSaturation: defaultRenderingPipeline.imageProcessing.colorCurves?.shadowsSaturation,
	};
}

export function parseDefaultRenderingPipeline(scene: Scene, camera: Camera, data: any, rootUrl: string): DefaultRenderingPipeline {
	if (defaultRenderingPipeline) {
		return defaultRenderingPipeline;
	}

	const pipeline = createDefaultRenderingPipeline(scene, camera);

	pipeline.samples = data.samples;
	pipeline.fxaaEnabled = data.fxaaEnabled;

	pipeline.imageProcessingEnabled = data.imageProcessingEnabled;
	if (pipeline.imageProcessing) {
		pipeline.imageProcessing.exposure = data.exposure;
		pipeline.imageProcessing.contrast = data.contrast;
		pipeline.imageProcessing.fromLinearSpace = data.fromLinearSpace;
		pipeline.imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
		pipeline.imageProcessing.toneMappingType = data.toneMappingType;
		pipeline.imageProcessing.ditheringEnabled = data.ditheringEnabled;
		pipeline.imageProcessing.ditheringIntensity = data.ditheringIntensity;

		// Since v5.0.0-alpha.9
		pipeline.imageProcessing.vignetteEnabled = data.vignetteEnabled ?? false;
		pipeline.imageProcessing.vignetteColor = Color4.FromArray(data.vignetteColor ?? [0, 0, 0]);
		pipeline.imageProcessing.vignetteWeight = data.vignetteWeight ?? 0.3;

		// Since v5.0.0-alpha.10
		pipeline.imageProcessing.colorGradingEnabled = data.colorGradingEnabled ?? false;
		pipeline.imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth = data.colorGradingWithGreenDepth ?? true;

		if (data.colorGradingTexture) {
			let texture: ColorGradingTexture | Texture | null = null;

			if (data.colorGradingTexture.customType === "BABYLON.ColorGradingTexture") {
				const absoluteUrl = rootUrl + data.colorGradingTexture.name;

				texture = new ColorGradingTexture(absoluteUrl, scene);
				texture.level = data.colorGradingTexture.level;
			} else {
				const parsedTexture = Texture.Parse(data.colorGradingTexture, scene, rootUrl);
				if (isTexture(parsedTexture)) {
					texture = parsedTexture;
				}
			}

			pipeline.imageProcessing.colorGradingTexture = texture;
		}

		pipeline.imageProcessing.colorCurvesEnabled = data.colorCurvesEnabled ?? false;
		if (pipeline.imageProcessing.colorCurves) {
			pipeline.imageProcessing.colorCurves.globalHue = data.globalHue ?? 30;
			pipeline.imageProcessing.colorCurves.globalDensity = data.globalDensity ?? 0;
			pipeline.imageProcessing.colorCurves.globalExposure = data.globalExposure ?? 0;
			pipeline.imageProcessing.colorCurves.globalSaturation = data.globalSaturation ?? 0;

			pipeline.imageProcessing.colorCurves.highlightsHue = data.highlightsHue ?? 30;
			pipeline.imageProcessing.colorCurves.highlightsDensity = data.highlightsDensity ?? 0;
			pipeline.imageProcessing.colorCurves.highlightsExposure = data.highlightsExposure ?? 0;
			pipeline.imageProcessing.colorCurves.highlightsSaturation = data.highlightsSaturation ?? 0;

			pipeline.imageProcessing.colorCurves.midtonesHue = data.midtonesHue ?? 30;
			pipeline.imageProcessing.colorCurves.midtonesDensity = data.midtonesDensity ?? 0;
			pipeline.imageProcessing.colorCurves.midtonesExposure = data.midtonesExposure ?? 0;
			pipeline.imageProcessing.colorCurves.midtonesSaturation = data.midtonesSaturation ?? 0;

			pipeline.imageProcessing.colorCurves.shadowsHue = data.shadowsHue ?? 30;
			pipeline.imageProcessing.colorCurves.shadowsDensity = data.shadowsDensity ?? 0;
			pipeline.imageProcessing.colorCurves.shadowsExposure = data.shadowsExposure ?? 0;
			pipeline.imageProcessing.colorCurves.shadowsSaturation = data.shadowsSaturation ?? 0;
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
	pipeline.chromaticAberrationEnabled = data.chromaticAberrationEnabled ?? false;
	pipeline.chromaticAberration.aberrationAmount = data.aberrationAmount ?? 10;
	pipeline.chromaticAberration.radialIntensity = data.radialIntensity ?? 1;
	pipeline.chromaticAberration.direction = Vector2.FromArray(data.direction ?? [0, 0]);
	pipeline.chromaticAberration.centerPosition = Vector2.FromArray(data.centerPosition ?? [0, 0]);

	pipeline.glowLayerEnabled = data.glowLayerEnabled ?? false;
	if (pipeline.glowLayer) {
		pipeline.glowLayer.intensity = data.glowLayerIntensity ?? 1;
		pipeline.glowLayer.blurKernelSize = data.glowLayerBlurKernelSize ?? 32;
	}

	return pipeline;
}
