import { Camera } from "babylonjs";

import { Editor } from "../main";

import { VolumetricLightingRenderingPipeline, IVolumetricLightingConfiguration, normalizeVolumetricLightingConfiguration } from "babylonjs-editor-tools";

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
 * Returns wether or not the volumetric lighting rendering pipeline is supported by the engine used by the editor.
 * @param editor defines the reference to the editor.
 */
export function isVolumetricLightingSupported(editor: Editor): boolean {
	const engine = editor.layout.preview.scene!.getEngine() as any;
	return engine ? VolumetricLightingRenderingPipeline.IsSupported(engine) : false;
}

export function disposeVolumetricLightingRenderingPipeline(): void {
	if (volumetricLightingRenderingPipeline) {
		volumetricLightingRenderingPipeline.dispose();
		volumetricLightingRenderingPipeline = null;
	}
}

export function createVolumetricLightingRenderingPipeline(editor: Editor): VolumetricLightingRenderingPipeline {
	const scene = editor.layout.preview.scene as any;

	volumetricLightingRenderingPipeline = new VolumetricLightingRenderingPipeline("VolumetricLightingRenderingPipeline", scene, scene.activeCamera!);

	return volumetricLightingRenderingPipeline;
}

export function serializeVolumetricLightingRenderingPipeline(): any {
	if (!volumetricLightingRenderingPipeline) {
		return null;
	}

	return volumetricLightingRenderingPipeline.serializeConfiguration();
}

export function parseVolumetricLightingRenderingPipeline(editor: Editor, data: any): VolumetricLightingRenderingPipeline {
	const pipeline = getVolumetricLightingRenderingPipeline() ?? createVolumetricLightingRenderingPipeline(editor);

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
