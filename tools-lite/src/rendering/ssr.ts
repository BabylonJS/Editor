import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";

/**
 * Babylon Lite has no screen space reflections post-process: the SSR rendering pipeline configured in the editor is
 * not rendered. The functions of this module are kept for compatibility with the Babylon.js version of the tools.
 */
export type SSRRenderingPipeline = never;

/**
 * Defines the configuration of the SSR rendering pipeline per camera.
 */
export const ssrRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getSSRRenderingPipeline(): SSRRenderingPipeline | null {
	return null;
}

/**
 * Sets the reference to the SSR rendering pipeline.
 * @access editor only.
 */
export function setSSRRenderingPipelineRef(pipeline: SSRRenderingPipeline | null): void {
	void pipeline;
}

export function disposeSSRRenderingPipeline(): void {}

export function createSSRRenderingPipeline(scene: SceneContext, camera: Camera, options?: IRenderingOptions): SSRRenderingPipeline | null {
	void scene;
	void camera;
	void options;

	warnOnce("ssr", "the SSR rendering pipeline is not supported by Babylon Lite.");
	return null;
}

export function serializeSSRRenderingPipeline(): any {
	return null;
}

export function parseSSRRenderingPipeline(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): SSRRenderingPipeline | null {
	void data;
	return createSSRRenderingPipeline(scene, camera, options);
}
