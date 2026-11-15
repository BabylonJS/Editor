import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Observer } from "@babylonjs/core/Misc/observable";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { PostProcessRenderEffect } from "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderEffect";

/**
 * Defines the order in which the rendering pipelines and post-processes handled by the editor run on a camera,
 * identified by their class name. It is the order "applyRenderingConfigurationForCamera" creates them in: the
 * effects working on the linear color of the scene first, then the image processing of the default rendering
 * pipeline and finally the temporal anti-aliasing.
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

const ranks = new Map<PostProcess, number>();
const sceneObservers = new WeakMap<Scene, Observer<Camera>>();

function getRenderEffects(pipeline: any): PostProcessRenderEffect[] {
	return Object.values((pipeline._renderEffects ?? {}) as Record<string, PostProcessRenderEffect>);
}

/**
 * Sorts the post-processes of the given camera so the rendering pipelines and post-processes handled by the editor
 * always run in the order defined by "renderingPipelinesOrder".
 *
 * Babylon.js always appends the post-processes it attaches at the end of the chain of the camera, so enabling a
 * pipeline again, or a pipeline rebuilding itself (the default rendering pipeline does it each time one of its
 * effects is toggled), would make it run after the ones that must follow it: typically the volumetric lighting
 * after the tone mapping of the default rendering pipeline, adding linear light to a gamma corrected color.
 *
 * Only the post-processes of the known pipelines move, among the slots they already occupy: the other ones, and the
 * empty slots left by the detached post-processes, keep their place.
 * @param camera defines the reference to the camera to sort its post-processes.
 * @returns true when the post-processes were out of order and have been sorted.
 */
export function sortCameraPostProcesses(camera: Camera): boolean {
	const scene = camera.getScene();
	const chain = (camera as any)._postProcesses as (PostProcess | null)[] | undefined;
	if (!chain?.length) {
		return false;
	}

	ranks.clear();

	const pipelines = scene.postProcessRenderPipelineManager?.supportedPipelines ?? [];
	pipelines.forEach((pipeline) => {
		const rank = renderingPipelinesOrder.indexOf(pipeline.getClassName());
		if (rank === -1) {
			return;
		}

		getRenderEffects(pipeline).forEach((renderEffect) => {
			renderEffect.getPostProcesses(camera)?.forEach((postProcess) => ranks.set(postProcess, rank));
		});
	});

	const slots: number[] = [];
	let lastRank = -1;
	let sorted = true;

	chain.forEach((postProcess, index) => {
		if (!postProcess) {
			return;
		}

		let rank = ranks.get(postProcess);
		if (rank === undefined) {
			rank = renderingPipelinesOrder.indexOf(postProcess.getClassName());
			if (rank === -1) {
				return;
			}

			ranks.set(postProcess, rank);
		}

		slots.push(index);

		if (rank < lastRank) {
			sorted = false;
		}

		lastRank = Math.max(lastRank, rank);
	});

	if (sorted) {
		return false;
	}

	// "Array.prototype.sort" is stable: the post-processes of a same pipeline keep their order.
	const postProcesses = slots.map((index) => chain[index]!).sort((a, b) => ranks.get(a)! - ranks.get(b)!);
	slots.forEach((index, i) => (chain[index] = postProcesses[i]));

	// The render effects enable their post-processes again at the indices they were attached at.
	pipelines.forEach((pipeline) => {
		if (renderingPipelinesOrder.indexOf(pipeline.getClassName()) === -1) {
			return;
		}

		getRenderEffects(pipeline).forEach((renderEffect) => {
			const indices = (renderEffect as any)._indicesForCamera as Record<string, number[]> | undefined;
			const effectPostProcesses = renderEffect.getPostProcesses(camera);

			if (indices?.[camera.name] && effectPostProcesses) {
				indices[camera.name] = effectPostProcesses.map((postProcess) => chain.indexOf(postProcess));
			}
		});
	});

	(camera as any)._cascadePostProcessesToRigCams?.();
	scene.prePassRenderer?.markAsDirty();

	return true;
}

/**
 * Keeps the rendering pipelines and post-processes of every camera of the given scene in the order defined by
 * "renderingPipelinesOrder", checked each time a camera is about to render. Calling this function multiple times
 * for the same scene has no effect.
 * @param scene defines the reference to the scene to keep its rendering pipelines ordered.
 */
export function keepRenderingPipelinesOrdered(scene: Scene): void {
	if (sceneObservers.has(scene)) {
		return;
	}

	const observer = scene.onBeforeCameraRenderObservable.add((camera) => sortCameraPostProcesses(camera));
	sceneObservers.set(scene, observer);

	scene.onDisposeObservable.addOnce(() => sceneObservers.delete(scene));
}
