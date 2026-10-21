import { Camera, EngineContext } from "@babylonjs/lite";

import { getNodeScene } from "../tools/scene";

import { keepRenderingPipelinesOrdered } from "./order";

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
	/**
	 * Kept for compatibility: the MSAA of Babylon Lite is configured when creating the engine (`createEngine`).
	 */
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
 * The post-processes are rendered by the frame graph tasks of the tools: the scene must be created using
 * `createEditorSceneContext`. The post-processes not supported by Babylon Lite are listed in MISSING_FEATURES.md.
 * @param camera defines the reference to the camera to apply its rendering configurations.
 * @param rootUrl defines the rootUrl that contains all resource files needed by the post-processes (color grading texture, etc.).
 */
export function applyRenderingConfigurationForCamera(camera: Camera, rootUrl: string, options?: IApplyRenderingConfigurationOptions) {
	const scene = getNodeScene(camera);
	if (!scene) {
		return console.warn(
			`Babylon.js Editor Tools Lite: can't apply the rendering configuration of the camera "${camera.name}": the camera doesn't belong to a scene loaded by the tools.`
		);
	}

	disposeSSAO2RenderingPipeline();
	disposeVLSPostProcess(scene);
	disposeSSRRenderingPipeline();
	disposeMotionBlurPostProcess();
	disposeVolumetricLightingRenderingPipeline();
	disposeDefaultRenderingPipeline();
	disposeTAARenderingPipeline();

	keepRenderingPipelinesOrdered(scene);

	const ssao2RenderingPipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
	if (ssao2RenderingPipeline && !options?.ssao2Disabled) {
		parseSSAO2RenderingPipeline(scene, camera, ssao2RenderingPipeline, options);
	}

	const volumetricLightingRenderingPipeline = getVolumetricLightingRenderingPipelineConfiguration();
	if (volumetricLightingRenderingPipeline && !options?.volumetricLightingDisabled) {
		parseVolumetricLightingRenderingPipeline(scene, camera, volumetricLightingRenderingPipeline, options);
	}

	const vlsPostProcess = vlsPostProcessCameraConfigurations.get(camera);
	if (vlsPostProcess && !options?.vlsDisabled) {
		parseVLSPostProcess(scene, vlsPostProcess, options);
	}

	const ssrRenderingPipeline = ssrRenderingPipelineCameraConfigurations.get(camera);
	if (ssrRenderingPipeline && !options?.ssrDisabled) {
		parseSSRRenderingPipeline(scene, camera, ssrRenderingPipeline, options);
	}

	const motionBlurPostProcess = motionBlurPostProcessCameraConfigurations.get(camera);
	if (motionBlurPostProcess && !options?.motionBlurDisabled) {
		parseMotionBlurPostProcess(scene, camera, motionBlurPostProcess, options);
	}

	const defaultRenderingPipeline = defaultPipelineCameraConfigurations.get(camera);
	if (defaultRenderingPipeline && !options?.defaultPipelineDisabled) {
		parseDefaultRenderingPipeline(scene, camera, defaultRenderingPipeline, rootUrl, options);
	}

	const taaRenderingPipeline = taaRenderingPipelineCameraConfigurations.get(camera);
	if (taaRenderingPipeline && !options?.taaDisabled) {
		parseTAARenderingPipeline(scene, camera, taaRenderingPipeline, options);
	}
}

/**
 * Determines whether the given engine can use HDR (High Dynamic Range) rendering.
 * Babylon Lite runs on WebGPU only, where the half-float render targets are always supported.
 * @param engine defines the Babylon Lite engine instance.
 */
export function canUseHdr(engine: EngineContext) {
	void engine;
	return true;
}

/**
 * Gets the appropriate HDR texture format for the given engine. Babylon Lite runs on WebGPU only, where the
 * half-float render targets are always supported.
 * @param engine defines the Babylon Lite engine instance.
 * @returns the HDR texture format.
 */
export function getHdrTextureType(engine: EngineContext): GPUTextureFormat {
	void engine;
	return "rgba16float";
}
