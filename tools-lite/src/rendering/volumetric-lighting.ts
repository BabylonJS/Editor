import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { _registerVolumetricLightingProvider, _requestRenderingStages, isEditorSceneContext } from "./pipeline";

import { VolumetricLightingRenderingPipeline } from "./volumetric/pipeline";
import { IVolumetricLightingConfiguration, normalizeVolumetricLightingConfiguration } from "./volumetric/types";

let volumetricLightingRenderingPipeline: VolumetricLightingRenderingPipeline | null = null;

/**
 * Defines the configuration of the volumetric lighting rendering pipeline for all cameras.
 */
let configuration: any = null;

_registerVolumetricLightingProvider((scene) => {
	const pipeline = getVolumetricLightingRenderingPipeline();
	return pipeline?.scene === scene ? pipeline : null;
});

export function getVolumetricLightingRenderingPipelineConfiguration(): any {
	return configuration;
}

export function setVolumetricLightingRenderingPipelineConfiguration(config: any) {
	configuration = config;
}

export function getVolumetricLightingRenderingPipeline(): VolumetricLightingRenderingPipeline | null {
	if (volumetricLightingRenderingPipeline?.isDisposed) {
		volumetricLightingRenderingPipeline = null;
	}

	return volumetricLightingRenderingPipeline;
}

/**
 * Sets the reference to the volumetric lighting rendering pipeline.
 * @access editor only.
 */
export function setVolumetricLightingRenderingPipelineRef(pipeline: VolumetricLightingRenderingPipeline | null): void {
	volumetricLightingRenderingPipeline = pipeline;
}

/**
 * Returns wether or not the volumetric lighting rendering pipeline is supported by the engine of the scene: Babylon Lite
 * runs on WebGPU only, which supports everything the pipeline needs.
 * @param scene defines the reference to the scene to check.
 */
export function isVolumetricLightingSupported(scene: SceneContext): boolean {
	return scene ? VolumetricLightingRenderingPipeline.IsSupported(scene.surface.engine) : false;
}

export function disposeVolumetricLightingRenderingPipeline(): void {
	if (volumetricLightingRenderingPipeline) {
		volumetricLightingRenderingPipeline.dispose();
		volumetricLightingRenderingPipeline = null;
	}
}

export function createVolumetricLightingRenderingPipeline(scene: SceneContext, camera: Camera, options?: IRenderingOptions): VolumetricLightingRenderingPipeline {
	volumetricLightingRenderingPipeline = new VolumetricLightingRenderingPipeline("VolumetricLightingRenderingPipeline", scene, camera);
	volumetricLightingRenderingPipeline.msaaSamples = options?.msaaSamples ?? 1;

	return volumetricLightingRenderingPipeline;
}

export function serializeVolumetricLightingRenderingPipeline(): any {
	if (!volumetricLightingRenderingPipeline) {
		return null;
	}

	return volumetricLightingRenderingPipeline.serializeConfiguration();
}

export function parseVolumetricLightingRenderingPipeline(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): VolumetricLightingRenderingPipeline {
	const pipeline = getVolumetricLightingRenderingPipeline() ?? createVolumetricLightingRenderingPipeline(scene, camera, options);
	pipeline.msaaSamples = options?.msaaSamples ?? 1;

	// A project saved before the medium was derived from the size of the scene has no value stored for it,
	// and the static defaults would be wrong for anything but a scene authored in centimetres.
	const configuration = { ...data };
	if (configuration.fogDensity === undefined) {
		configuration.fogDensity = VolumetricLightingRenderingPipeline.GetDefaultFogDensity(pipeline.scene, pipeline.camera);
	}
	if (configuration.fogEnd === undefined) {
		configuration.fogEnd = VolumetricLightingRenderingPipeline.GetDefaultFogEnd(pipeline.scene, pipeline.camera);
	}
	if (configuration.screenSpaceShadowMaxDistance === undefined) {
		configuration.screenSpaceShadowMaxDistance = VolumetricLightingRenderingPipeline.GetDefaultFogEnd(pipeline.scene, pipeline.camera);
	}

	pipeline.applyConfiguration(normalizeVolumetricLightingConfiguration(configuration) as IVolumetricLightingConfiguration);

	if (!isEditorSceneContext(scene)) {
		warnOnce("volumetric-lighting-editor-scene", "the volumetric lighting rendering pipeline is rendered only by the scenes created using createEditorSceneContext.");
	}

	if (!_requestRenderingStages(scene, { volumetricLighting: true })) {
		warnOnce(
			"volumetric-lighting-frame-graph",
			"the volumetric lighting rendering pipeline can't be added to the frame graph of a scene once built: load a scene with a volumetric lighting configuration first."
		);
	}

	return pipeline;
}

/**
 * Marks the list of lights contributing to the volumetric lighting as dirty. Called when the volumetric
 * configuration of a light is edited so the effect updates without waiting for the next selection pass.
 */
export function markVolumetricLightsDirty(): void {
	volumetricLightingRenderingPipeline?.markLightsDirty();
}
