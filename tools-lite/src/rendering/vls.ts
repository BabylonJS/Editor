import { Camera, Mesh, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";

/**
 * Babylon Lite has no volumetric light scattering post-process: the volumetric light scattering configured in the
 * editor is not rendered. The functions of this module are kept for compatibility with the Babylon.js version of the tools.
 */
export type VolumetricLightScatteringPostProcess = never;

/**
 * Defines the configuration of the volumetric light scattering post-process per camera.
 */
export const vlsPostProcessCameraConfigurations = new Map<Camera, any>();

export function getVLSPostProcess(): VolumetricLightScatteringPostProcess | null {
	return null;
}

/**
 * Sets the reference to the volumetric light scattering post-process.
 * @access editor only.
 */
export function setVLSPostProcessRef(postProcess: VolumetricLightScatteringPostProcess | null): void {
	void postProcess;
}

export function disposeVLSPostProcess(scene: SceneContext): void {
	void scene;
}

export function createVLSPostProcess(scene: SceneContext, mesh?: Mesh | null, options?: IRenderingOptions): VolumetricLightScatteringPostProcess | null {
	void scene;
	void mesh;
	void options;

	warnOnce("vls", "the volumetric light scattering post-process is not supported by Babylon Lite.");
	return null;
}

export function serializeVLSPostProcess(): any {
	return null;
}

export function parseVLSPostProcess(scene: SceneContext, data: any, options?: IRenderingOptions): VolumetricLightScatteringPostProcess | null {
	void data;
	return createVLSPostProcess(scene, null, options);
}
