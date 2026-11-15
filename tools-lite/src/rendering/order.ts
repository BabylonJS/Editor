import { Camera, SceneContext } from "@babylonjs/lite";

/**
 * Defines the order in which the rendering pipelines and post-processes handled by the editor run on a camera,
 * identified by their class name. Kept for compatibility with the Babylon.js version of the tools: the frame graph
 * tasks of the tools always render the post-processes in this order.
 */
export const renderingPipelinesOrder: string[] = [
	"SSAO2RenderingPipeline",
	"VolumetricLightingRenderingPipeline",
	"VolumetricLightScatteringPostProcess",
	"SSRRenderingPipeline",
	"MotionBlurPostProcess",
	"DefaultRenderingPipeline",
	"TAARenderingPipeline",
];

/**
 * Kept for compatibility with the Babylon.js version of the tools: the frame graph tasks of the tools always render
 * the post-processes in the order defined by "renderingPipelinesOrder".
 * @param camera defines the reference to the camera to sort its post-processes.
 * @returns always false.
 */
export function sortCameraPostProcesses(camera: Camera): boolean {
	void camera;
	return false;
}

/**
 * Kept for compatibility with the Babylon.js version of the tools: the frame graph tasks of the tools always render
 * the post-processes in the order defined by "renderingPipelinesOrder".
 * @param scene defines the reference to the scene.
 */
export function keepRenderingPipelinesOrdered(scene: SceneContext): void {
	void scene;
}
