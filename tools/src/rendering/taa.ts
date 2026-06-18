import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { TAARenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/taaRenderingPipeline";

let taaRenderingPipeline: TAARenderingPipeline | null = null;

/**
 * Defines the configuration of the taa rendering pipeline per camera.
 */
export const taaRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getTAARenderingPipeline(): TAARenderingPipeline | null {
	return taaRenderingPipeline;
}

/**
 * Sets the reference to the taa rendering pipeline.
 * @access editor only.
 */
export function setTAARenderingPipelineRef(pipeline: TAARenderingPipeline | null): void {
	taaRenderingPipeline = pipeline;
}

export function disposeTAARenderingPipeline(): void {
	if (taaRenderingPipeline) {
		taaRenderingPipeline.dispose();
		taaRenderingPipeline = null;
	}
}

export function createTAARenderingPipeline(scene: Scene, camera: Camera): TAARenderingPipeline {
	taaRenderingPipeline = new TAARenderingPipeline("TAARenderingPipeline", scene, [camera]);
	taaRenderingPipeline.samples = 4;

	return taaRenderingPipeline;
}

export function serializeTAARenderingPipeline(): any {
	if (!taaRenderingPipeline) {
		return null;
	}

	return {
		factor: taaRenderingPipeline.factor,
		samples: taaRenderingPipeline.samples,
		clampHistory: taaRenderingPipeline.clampHistory,
		reprojectHistory: taaRenderingPipeline.reprojectHistory,
		disableOnCameraMove: taaRenderingPipeline.disableOnCameraMove,
	};
}

export function parseTAARenderingPipeline(scene: Scene, camera: Camera, data: any): TAARenderingPipeline {
	if (taaRenderingPipeline) {
		return taaRenderingPipeline;
	}

	const pipeline = createTAARenderingPipeline(scene, camera);

	pipeline.factor = data.factor;
	pipeline.samples = data.samples;
	pipeline.clampHistory = data.clampHistory;
	pipeline.reprojectHistory = data.reprojectHistory;
	pipeline.disableOnCameraMove = data.disableOnCameraMove;

	return pipeline;
}
