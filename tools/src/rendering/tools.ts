import { Camera } from "@babylonjs/core/Cameras/camera";
import { Constants } from "@babylonjs/core/Engines/constants";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

import { disposeVLSPostProcess, parseVLSPostProcess, serializeVLSPostProcess, vlsPostProcessCameraConfigurations } from "./vls";
import { disposeSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "./ssr";
import { disposeTAARenderingPipeline, parseTAARenderingPipeline, serializeTAARenderingPipeline, taaRenderingPipelineCameraConfigurations } from "./taa";
import { disposeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "./ssao";
import { disposeMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "./motion-blur";
import { defaultPipelineCameraConfigurations, disposeDefaultRenderingPipeline, parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "./default-pipeline";
import {
	disposeVolumetricLightingRenderingPipeline,
	parseVolumetricLightingRenderingPipeline,
	serializeVolumetricLightingRenderingPipeline,
	setVolumetricLightingRenderingPipelineConfiguration,
	getVolumetricLightingRenderingPipelineConfiguration,
} from "./volumetric-lighting";

/**
 * Saves the rendering configurations for the given camera. This is useful to restore the rendering configurations
 * when the camera is re-activated (typically using the preview panel toolbar).
 * @param camera defines the reference to the camera to save its rendering configurations.
 */
export function saveRenderingConfigurationForCamera(camera: Camera) {
	ssaoRenderingPipelineCameraConfigurations.set(camera, serializeSSAO2RenderingPipeline());
	vlsPostProcessCameraConfigurations.set(camera, serializeVLSPostProcess());
	ssrRenderingPipelineCameraConfigurations.set(camera, serializeSSRRenderingPipeline());
	motionBlurPostProcessCameraConfigurations.set(camera, serializeMotionBlurPostProcess());
	defaultPipelineCameraConfigurations.set(camera, serializeDefaultRenderingPipeline());
	taaRenderingPipelineCameraConfigurations.set(camera, serializeTAARenderingPipeline());

	setVolumetricLightingRenderingPipelineConfiguration(serializeVolumetricLightingRenderingPipeline());
}

export interface IRenderingOptions {
	msaaSamples?: number;
}

export interface IApplyRenderingConfigurationOptions extends IRenderingOptions {
	ssao2Disabled?: boolean;
	vlsDisabled?: boolean;
	ssrDisabled?: boolean;
	motionBlurDisabled?: boolean;
	volumetricLightingDisabled?: boolean;
	defaultPipelineDisabled?: boolean;
	taaDisabled?: boolean;
}

/**
 * Applies the post-processes configurations for the given camera. Rendering configurations (motion blur, ssao, etc.) are
 * saved per-camera and can be applied on demand using this function.
 * Previous post-processes configurations are disposed before applying the new ones.
 * @param camera defines the reference to the camera to apply its rendering configurations.
 * @param rootUrl defines the rootUrl that contains all resource files needed by the post-processes (color grading texture, etc.).
 */
export function applyRenderingConfigurationForCamera(camera: Camera, rootUrl: string, options?: IApplyRenderingConfigurationOptions) {
	disposeSSAO2RenderingPipeline();
	disposeVLSPostProcess(camera.getScene());
	disposeSSRRenderingPipeline();
	disposeMotionBlurPostProcess();
	disposeVolumetricLightingRenderingPipeline();
	disposeDefaultRenderingPipeline();
	disposeTAARenderingPipeline();

	const ssao2RenderingPipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
	if (ssao2RenderingPipeline && !options?.ssao2Disabled) {
		parseSSAO2RenderingPipeline(camera.getScene(), camera, ssao2RenderingPipeline, options);
	}

	const volumetricLightingRenderingPipeline = getVolumetricLightingRenderingPipelineConfiguration();
	if (volumetricLightingRenderingPipeline && !options?.volumetricLightingDisabled) {
		parseVolumetricLightingRenderingPipeline(camera.getScene(), camera, volumetricLightingRenderingPipeline, options);
	}

	const vlsPostProcess = vlsPostProcessCameraConfigurations.get(camera);
	if (vlsPostProcess && !options?.vlsDisabled) {
		parseVLSPostProcess(camera.getScene(), vlsPostProcess, options);
	}

	const ssrRenderingPipeline = ssrRenderingPipelineCameraConfigurations.get(camera);
	if (ssrRenderingPipeline && !options?.ssrDisabled) {
		parseSSRRenderingPipeline(camera.getScene(), camera, ssrRenderingPipeline, options);
	}

	const motionBlurPostProcess = motionBlurPostProcessCameraConfigurations.get(camera);
	if (motionBlurPostProcess && !options?.motionBlurDisabled) {
		parseMotionBlurPostProcess(camera.getScene(), camera, motionBlurPostProcess, options);
	}

	const defaultRenderingPipeline = defaultPipelineCameraConfigurations.get(camera);
	if (defaultRenderingPipeline && !options?.defaultPipelineDisabled) {
		parseDefaultRenderingPipeline(camera.getScene(), camera, defaultRenderingPipeline, rootUrl, options);
	}

	const taaRenderingPipeline = taaRenderingPipelineCameraConfigurations.get(camera);
	if (taaRenderingPipeline && !options?.taaDisabled) {
		parseTAARenderingPipeline(camera.getScene(), camera, taaRenderingPipeline, options);
	}
}

/**
 * Determines whether the given engine can use HDR (High Dynamic Range) rendering.
 * Returns true if the engine supports either half-float or full-float render targets.
 * @param engine defines the Babylon.js engine instance.
 */
export function canUseHdr(engine: AbstractEngine) {
	const caps = engine.getCaps();
	return caps.textureHalfFloatRender || caps.textureFloatRender;
}

/**
 * Gets the appropriate HDR texture type for the given engine.
 * @param engine defines the Babylon.js engine instance.
 * @returns the HDR texture type constant.
 */
export function getHdrTextureType(engine: AbstractEngine) {
	const caps = engine.getCaps();
	if (caps.textureHalfFloatRender) {
		return Constants.TEXTURETYPE_HALF_FLOAT;
	} else if (caps.textureFloatRender) {
		return Constants.TEXTURETYPE_FLOAT;
	}

	return Constants.TEXTURETYPE_UNSIGNED_BYTE;
}
