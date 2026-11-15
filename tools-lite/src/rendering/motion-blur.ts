import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { isEditorSceneContext } from "./pipeline";

import { MotionBlurPostProcess } from "./motion-blur/post-process";

export * from "./motion-blur/post-process";

let motionBlurPostProcess: MotionBlurPostProcess | null = null;

/**
 * Defines the configuration of the motion blur post-process per camera.
 */
export const motionBlurPostProcessCameraConfigurations = new Map<Camera, any>();

export function getMotionBlurPostProcess(): MotionBlurPostProcess | null {
	return motionBlurPostProcess;
}

/**
 * Sets the reference to the motion blur post-process.
 * @access editor only.
 */
export function setMotionBlurPostProcessRef(postProcess: MotionBlurPostProcess | null): void {
	motionBlurPostProcess = postProcess;
}

export function disposeMotionBlurPostProcess(): void {
	if (motionBlurPostProcess) {
		motionBlurPostProcess.dispose();
		motionBlurPostProcess = null;
	}
}

export function createMotionBlurPostProcess(scene: SceneContext, camera: Camera, options?: IRenderingOptions): MotionBlurPostProcess {
	motionBlurPostProcess = new MotionBlurPostProcess("MotionBlurPostProcess", scene, 1.0, camera);
	motionBlurPostProcess.samples = options?.msaaSamples ?? 1;
	motionBlurPostProcess.motionStrength = 1.0;
	motionBlurPostProcess.isObjectBased = true;

	if (!isEditorSceneContext(scene)) {
		warnOnce("motion-blur-editor-scene", "the motion blur post-process is rendered only by the scenes created using createEditorSceneContext.");
	}

	return motionBlurPostProcess;
}

export function serializeMotionBlurPostProcess(): any {
	if (!motionBlurPostProcess) {
		return null;
	}

	return {
		isObjectBased: motionBlurPostProcess.isObjectBased,
		motionStrength: motionBlurPostProcess.motionStrength,
		motionBlurSamples: motionBlurPostProcess.motionBlurSamples,
	};
}

export function parseMotionBlurPostProcess(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): MotionBlurPostProcess {
	const postProcess = motionBlurPostProcess ?? createMotionBlurPostProcess(scene, camera, options);
	postProcess.samples = options?.msaaSamples ?? 1;

	postProcess.isObjectBased = data.isObjectBased;
	postProcess.motionStrength = data.motionStrength;
	postProcess.motionBlurSamples = data.motionBlurSamples;

	return postProcess;
}
