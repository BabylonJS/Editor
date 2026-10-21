import { SceneContext } from "@babylonjs/lite";

import { getNodeById } from "../tools/scene";

import { _requestRenderingStages } from "../rendering/pipeline";

import { vlsPostProcessCameraConfigurations } from "../rendering/vls";
import { ssrRenderingPipelineCameraConfigurations } from "../rendering/ssr";
import { taaRenderingPipelineCameraConfigurations } from "../rendering/taa";
import { ssaoRenderingPipelineCameraConfigurations } from "../rendering/ssao";
import { motionBlurPostProcessCameraConfigurations } from "../rendering/motion-blur";
import { defaultPipelineCameraConfigurations } from "../rendering/default-pipeline";
import { setVolumetricLightingRenderingPipelineConfiguration } from "../rendering/volumetric-lighting";

export function applyRenderingConfigurations(scene: SceneContext, metadata: any): void {
	const rendering = metadata?.rendering;

	// Volumetric lighting (the same configuration for all cameras)
	if (metadata.volumetricLightingRenderingPipelineConfiguration) {
		setVolumetricLightingRenderingPipelineConfiguration(metadata.volumetricLightingRenderingPipelineConfiguration);
		_requestRenderingStages(scene, { volumetricLighting: true });
	}

	// For each camera
	const postProcessConfigurations = Array.isArray(rendering) ? rendering : [];

	postProcessConfigurations.forEach((configuration) => {
		const camera = getNodeById(configuration.cameraId, scene);
		if (!camera || !("fov" in camera)) {
			return;
		}

		if (configuration.ssao2RenderingPipeline) {
			ssaoRenderingPipelineCameraConfigurations.set(camera, configuration.ssao2RenderingPipeline);
		}

		if (configuration.vlsPostProcess) {
			vlsPostProcessCameraConfigurations.set(camera, configuration.vlsPostProcess);
		}

		if (configuration.ssrRenderingPipeline) {
			ssrRenderingPipelineCameraConfigurations.set(camera, configuration.ssrRenderingPipeline);
		}

		if (configuration.motionBlurPostProcess) {
			motionBlurPostProcessCameraConfigurations.set(camera, configuration.motionBlurPostProcess);
		}

		if (configuration.defaultRenderingPipeline) {
			defaultPipelineCameraConfigurations.set(camera, configuration.defaultRenderingPipeline);
		}

		if (configuration.taaRenderingPipeline) {
			taaRenderingPipelineCameraConfigurations.set(camera, configuration.taaRenderingPipeline);
		}

		// The frame graph of a Babylon Lite scene can't change once built: it contains the post-processes used by
		// any of the cameras so the rendering configuration of another camera can be applied later.
		const defaultPipeline = configuration.defaultRenderingPipeline;
		_requestRenderingStages(scene, {
			bloom: defaultPipeline?.bloomEnabled ?? false,
			depthOfField: defaultPipeline?.depthOfFieldEnabled ?? false,
			depthOfFieldBlurLevel: defaultPipeline?.depthOfFieldBlurLevel,
			chromaticAberration: defaultPipeline?.chromaticAberrationEnabled ?? false,
			taa: !!configuration.taaRenderingPipeline,
			taaSamples: configuration.taaRenderingPipeline?.samples,
		});
	});
}
