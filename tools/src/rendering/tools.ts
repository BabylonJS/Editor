import { Camera } from "@babylonjs/core/Cameras/camera";

import { disposeVLSPostProcess, parseVLSPostProcess, serializeVLSPostProcess, vlsPostProcessCameraConfigurations } from "./vls";
import { disposeSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "./ssr";
import { disposeTAARenderingPipeline, parseTAARenderingPipeline, serializeTAARenderingPipeline, taaRenderingPipelineCameraConfigurations } from "./taa";
import { disposeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "./ssao";
import { disposeMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "./motion-blur";
import { defaultPipelineCameraConfigurations, disposeDefaultRenderingPipeline, parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "./default-pipeline";

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
}

export interface IApplyRenderingConfigurationOptions {
	ssao2Disabled?: boolean;
	vlsDisabled?: boolean;
	ssrDisabled?: boolean;
	motionBlurDisabled?: boolean;
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
	disposeDefaultRenderingPipeline();
	disposeTAARenderingPipeline();

	const ssao2RenderingPipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
	if (ssao2RenderingPipeline && !options?.ssao2Disabled) {
		parseSSAO2RenderingPipeline(camera.getScene(), camera, ssao2RenderingPipeline);
	}

	const vlsPostProcess = vlsPostProcessCameraConfigurations.get(camera);
	if (vlsPostProcess && !options?.vlsDisabled) {
		parseVLSPostProcess(camera.getScene(), vlsPostProcess);
	}

	const ssrRenderingPipeline = ssrRenderingPipelineCameraConfigurations.get(camera);
	if (ssrRenderingPipeline && !options?.ssrDisabled) {
		parseSSRRenderingPipeline(camera.getScene(), camera, ssrRenderingPipeline);
	}

	const motionBlurPostProcess = motionBlurPostProcessCameraConfigurations.get(camera);
	if (motionBlurPostProcess && !options?.motionBlurDisabled) {
		parseMotionBlurPostProcess(camera.getScene(), camera, motionBlurPostProcess);
	}

	const defaultRenderingPipeline = defaultPipelineCameraConfigurations.get(camera);
	if (defaultRenderingPipeline && !options?.defaultPipelineDisabled) {
		parseDefaultRenderingPipeline(camera.getScene(), camera, defaultRenderingPipeline, rootUrl);
	}

	const taaRenderingPipeline = taaRenderingPipelineCameraConfigurations.get(camera);
	if (taaRenderingPipeline && !options?.taaDisabled) {
		parseTAARenderingPipeline(camera.getScene(), camera, taaRenderingPipeline);
	}
}
