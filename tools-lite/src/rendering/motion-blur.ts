import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";

/**
 * Babylon Lite has no motion blur post-process: the motion blur configured in the editor is not rendered.
 * The functions of this module are kept for compatibility with the Babylon.js version of the tools.
 */
export type MotionBlurPostProcess = never;

/**
 * Defines the configuration of the motion blur post-process per camera.
 */
export const motionBlurPostProcessCameraConfigurations = new Map<Camera, any>();

export function getMotionBlurPostProcess(): MotionBlurPostProcess | null {
	return null;
}

/**
 * Sets the reference to the motion blur post-process.
 * @access editor only.
 */
export function setMotionBlurPostProcessRef(postProcess: MotionBlurPostProcess | null): void {
	void postProcess;
}

export function disposeMotionBlurPostProcess(): void {}

export function createMotionBlurPostProcess(scene: SceneContext, camera: Camera, options?: IRenderingOptions): MotionBlurPostProcess | null {
	void scene;
	void camera;
	void options;

	warnOnce("motion-blur", "the motion blur post-process is not supported by Babylon Lite.");
	return null;
}

export function serializeMotionBlurPostProcess(): any {
	return null;
}

export function parseMotionBlurPostProcess(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): MotionBlurPostProcess | null {
	void data;
	return createMotionBlurPostProcess(scene, camera, options);
}
