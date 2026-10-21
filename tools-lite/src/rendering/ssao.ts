import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";

/**
 * Babylon Lite has no SSAO post-process: the SSAO rendering pipeline configured in the editor is not rendered.
 * The functions of this module are kept for compatibility with the Babylon.js version of the tools.
 */
export type SSAO2RenderingPipeline = never;

/**
 * Defines the configuration of the SSAO rendering pipeline per camera.
 */
export const ssaoRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getSSAO2RenderingPipeline(): SSAO2RenderingPipeline | null {
	return null;
}

/**
 * Sets the reference to the SSAO rendering pipeline.
 * @access editor only.
 */
export function setSSAO2RenderingPipelineRef(pipeline: SSAO2RenderingPipeline | null): void {
	void pipeline;
}

export function disposeSSAO2RenderingPipeline(): void {}

export function createSSAO2RenderingPipeline(scene: SceneContext, camera: Camera, _options?: IRenderingOptions): SSAO2RenderingPipeline | null {
	void scene;
	void camera;

	warnOnce("ssao", "the SSAO rendering pipeline is not supported by Babylon Lite.");
	return null;
}

export function serializeSSAO2RenderingPipeline(): any {
	return null;
}

export function parseSSAO2RenderingPipeline(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): SSAO2RenderingPipeline | null {
	void data;
	return createSSAO2RenderingPipeline(scene, camera, options);
}
