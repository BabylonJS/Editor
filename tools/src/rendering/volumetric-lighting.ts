import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";

import { VolumetricLightingRenderingPipeline } from "./volumetric/pipeline";
import { IVolumetricLightingConfiguration, normalizeVolumetricLightingConfiguration } from "./volumetric/types";

let volumetricLightingRenderingPipeline: VolumetricLightingRenderingPipeline | null = null;

/**
 * Defines the configuration of the volumetric lighting rendering pipeline per camera.
 */
export const volumetricLightingRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getVolumetricLightingRenderingPipeline(): VolumetricLightingRenderingPipeline | null {
	// Babylon.js disposes a rendering pipeline on its own as soon as one of its post-processes fails to
	// compile. Without this the editor would keep reporting the effect as enabled while nothing renders.
	if (volumetricLightingRenderingPipeline?.isDisposed) {
		volumetricLightingRenderingPipeline = null;
	}

	return volumetricLightingRenderingPipeline;
}

/**
 * Sets the reference to the default rendering pipeline.
 * @access editor only.
 */
export function setVolumetricLightingRenderingPipelineRef(pipeline: VolumetricLightingRenderingPipeline | null): void {
	volumetricLightingRenderingPipeline = pipeline;
}

/**
 * Returns wether or not the volumetric lighting rendering pipeline is supported by the engine used by the editor.
 * @param editor defines the reference to the editor.
 */
export function isVolumetricLightingSupported(scene: Scene): boolean {
	const engine = scene?.getEngine();
	return engine ? VolumetricLightingRenderingPipeline.IsSupported(engine) : false;
}

export function disposeVolumetricLightingRenderingPipeline(): void {
	if (volumetricLightingRenderingPipeline) {
		volumetricLightingRenderingPipeline.dispose();
		volumetricLightingRenderingPipeline = null;
	}
}

export function createVolumetricLightingRenderingPipeline(scene: Scene, camera: Camera): VolumetricLightingRenderingPipeline {
	volumetricLightingRenderingPipeline = new VolumetricLightingRenderingPipeline("VolumetricLightingRenderingPipeline", scene, camera);

	return volumetricLightingRenderingPipeline;
}

export function serializeVolumetricLightingRenderingPipeline(): any {
	if (!volumetricLightingRenderingPipeline) {
		return null;
	}

	return volumetricLightingRenderingPipeline.serializeConfiguration();
}

export function parseVolumetricLightingRenderingPipeline(scene: Scene, camera: Camera, data: any): VolumetricLightingRenderingPipeline {
	const pipeline = getVolumetricLightingRenderingPipeline() ?? createVolumetricLightingRenderingPipeline(scene, camera);

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

	return pipeline;
}

/**
 * Marks the list of lights contributing to the volumetric lighting as dirty. Called when the volumetric
 * configuration of a light is edited so the effect updates without waiting for the next selection pass.
 */
export function markVolumetricLightsDirty(): void {
	volumetricLightingRenderingPipeline?.markLightsDirty();
}
