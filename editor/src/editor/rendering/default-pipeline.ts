import { dirname, join } from "path/posix";

import { DefaultRenderingPipeline, Color4, Vector2, Camera, Texture, ColorGradingTexture } from "babylonjs";

import { isTexture } from "../../tools/guards/texture";

import { projectConfiguration } from "../../project/configuration";

import { configureImportedTexture } from "../layout/preview/import/import";

import { Editor } from "../main";

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

export function disposeDefaultRenderingPipeline(): void {
	if (defaultRenderingPipeline) {
		defaultRenderingPipeline.dispose();
		defaultRenderingPipeline = null;
	}
}

export function createDefaultRenderingPipeline(editor: Editor): DefaultRenderingPipeline {
	defaultRenderingPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", true, editor.layout.preview.scene, [editor.layout.preview.scene.activeCamera!]);
	defaultRenderingPipeline.samples = 16;

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

export function parseDefaultRenderingPipeline(editor: Editor, data: any): DefaultRenderingPipeline {
	const defaultRenderingPipeline = getDefaultRenderingPipeline() ?? createDefaultRenderingPipeline(editor);

	defaultRenderingPipeline.samples = data.samples;
	defaultRenderingPipeline.fxaaEnabled = data.fxaaEnabled;

	defaultRenderingPipeline.imageProcessingEnabled = data.imageProcessingEnabled;
	if (defaultRenderingPipeline.imageProcessing) {
		defaultRenderingPipeline.imageProcessing.exposure = data.exposure;
		defaultRenderingPipeline.imageProcessing.contrast = data.contrast;
		defaultRenderingPipeline.imageProcessing.fromLinearSpace = data.fromLinearSpace;
		defaultRenderingPipeline.imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
		defaultRenderingPipeline.imageProcessing.toneMappingType = data.toneMappingType;
		defaultRenderingPipeline.imageProcessing.ditheringEnabled = data.ditheringEnabled;
		defaultRenderingPipeline.imageProcessing.ditheringIntensity = data.ditheringIntensity;

		// Since v5.0.0-alpha.9
		defaultRenderingPipeline.imageProcessing.vignetteEnabled = data.vignetteEnabled ?? false;
		defaultRenderingPipeline.imageProcessing.vignetteColor = Color4.FromArray(data.vignetteColor ?? [0, 0, 0]);
		defaultRenderingPipeline.imageProcessing.vignetteWeight = data.vignetteWeight ?? 0.3;

		// Since v5.0.0-alpha.10
		defaultRenderingPipeline.imageProcessing.colorGradingEnabled = data.colorGradingEnabled ?? false;
		defaultRenderingPipeline.imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth = data.colorGradingWithGreenDepth ?? true;

		if (data.colorGradingTexture && projectConfiguration.path) {
			const rootUrl = join(dirname(projectConfiguration.path!), "/");

			let texture: ColorGradingTexture | Texture | null = null;

			if (data.colorGradingTexture.customType === "BABYLON.ColorGradingTexture") {
				const absoluteUrl = join(rootUrl, data.colorGradingTexture.name);

				texture = configureImportedTexture(new ColorGradingTexture(absoluteUrl, editor.layout.preview.scene));
				texture.level = data.colorGradingTexture.level;
			} else {
				const parsedTexture = Texture.Parse(data.colorGradingTexture, editor.layout.preview.scene, rootUrl);
				if (isTexture(parsedTexture)) {
					texture = parsedTexture;
				}
			}

			defaultRenderingPipeline.imageProcessing.colorGradingTexture = texture;
		}

		defaultRenderingPipeline.imageProcessing.colorCurvesEnabled = data.colorCurvesEnabled ?? false;
		if (defaultRenderingPipeline.imageProcessing.colorCurves) {
			defaultRenderingPipeline.imageProcessing.colorCurves.globalHue = data.globalHue ?? 30;
			defaultRenderingPipeline.imageProcessing.colorCurves.globalDensity = data.globalDensity ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.globalExposure = data.globalExposure ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.globalSaturation = data.globalSaturation ?? 0;

			defaultRenderingPipeline.imageProcessing.colorCurves.highlightsHue = data.highlightsHue ?? 30;
			defaultRenderingPipeline.imageProcessing.colorCurves.highlightsDensity = data.highlightsDensity ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.highlightsExposure = data.highlightsExposure ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.highlightsSaturation = data.highlightsSaturation ?? 0;

			defaultRenderingPipeline.imageProcessing.colorCurves.midtonesHue = data.midtonesHue ?? 30;
			defaultRenderingPipeline.imageProcessing.colorCurves.midtonesDensity = data.midtonesDensity ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.midtonesExposure = data.midtonesExposure ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.midtonesSaturation = data.midtonesSaturation ?? 0;

			defaultRenderingPipeline.imageProcessing.colorCurves.shadowsHue = data.shadowsHue ?? 30;
			defaultRenderingPipeline.imageProcessing.colorCurves.shadowsDensity = data.shadowsDensity ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.shadowsExposure = data.shadowsExposure ?? 0;
			defaultRenderingPipeline.imageProcessing.colorCurves.shadowsSaturation = data.shadowsSaturation ?? 0;
		}
	}

	defaultRenderingPipeline.bloomEnabled = data.bloomEnabled;
	defaultRenderingPipeline.bloomThreshold = data.bloomThreshold;
	defaultRenderingPipeline.bloomWeight = data.bloomWeight;
	defaultRenderingPipeline.bloomScale = data.bloomScale;
	defaultRenderingPipeline.bloomKernel = data.bloomKernel;

	defaultRenderingPipeline.sharpenEnabled = data.sharpenEnabled;
	defaultRenderingPipeline.sharpen.edgeAmount = data.sharpenEdgeAmount;
	defaultRenderingPipeline.sharpen.colorAmount = data.sharpenColorAmount;

	defaultRenderingPipeline.grainEnabled = data.grainEnabled;
	defaultRenderingPipeline.grain.intensity = data.grainIntensity;
	defaultRenderingPipeline.grain.animated = data.grainAnimated;

	defaultRenderingPipeline.depthOfFieldEnabled = data.depthOfFieldEnabled;
	defaultRenderingPipeline.depthOfFieldBlurLevel = data.depthOfFieldBlurLevel;
	defaultRenderingPipeline.depthOfField.lensSize = data.lensSize;
	defaultRenderingPipeline.depthOfField.fStop = data.fStop;
	defaultRenderingPipeline.depthOfField.focusDistance = data.focusDistance;
	defaultRenderingPipeline.depthOfField.focalLength = data.focalLength;

	// Since v5.0.0-alpha.9
	defaultRenderingPipeline.chromaticAberrationEnabled = data.chromaticAberrationEnabled ?? false;
	defaultRenderingPipeline.chromaticAberration.aberrationAmount = data.aberrationAmount ?? 10;
	defaultRenderingPipeline.chromaticAberration.radialIntensity = data.radialIntensity ?? 1;
	defaultRenderingPipeline.chromaticAberration.direction = Vector2.FromArray(data.direction ?? [0, 0]);
	defaultRenderingPipeline.chromaticAberration.centerPosition = Vector2.FromArray(data.centerPosition ?? [0, 0]);

	defaultRenderingPipeline.glowLayerEnabled = data.glowLayerEnabled ?? false;
	if (defaultRenderingPipeline.glowLayer) {
		defaultRenderingPipeline.glowLayer.intensity = data.glowLayerIntensity ?? 1;
		defaultRenderingPipeline.glowLayer.blurKernelSize = data.glowLayerBlurKernelSize ?? 32;
	}

	return defaultRenderingPipeline;
}
