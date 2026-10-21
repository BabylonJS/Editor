import { Camera, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { _registerRenderingSettingsProvider, _requestRenderingStages, isEditorSceneContext } from "./pipeline";

/**
 * Defines the temporal anti-aliasing rendering pipeline, with the same properties as the Babylon.js
 * `TAARenderingPipeline`. It is rendered by the frame graph tasks of the tools (see `createEditorSceneContext`)
 * using the TAA post-process of Babylon Lite.
 */
export class TAARenderingPipeline {
	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;
	/**
	 * Defines the reference to the scene the pipeline renders.
	 */
	public readonly scene: SceneContext;
	/**
	 * Defines the cameras the pipeline is attached to.
	 */
	public cameras: Camera[];

	/**
	 * Defines wether or not the pipeline is enabled.
	 */
	public isEnabled: boolean = true;
	/**
	 * Defines the blend weight of the current frame against the accumulated history.
	 */
	public factor: number = 0.05;
	/**
	 * Defines the number of jitter samples. Babylon Lite reads it only when the frame graph is built.
	 */
	public samples: number = 8;
	/**
	 * Kept for compatibility: the history is always clamped by Babylon Lite.
	 */
	public clampHistory: boolean = true;
	/**
	 * Kept for compatibility: Babylon Lite doesn't reproject the history.
	 */
	public reprojectHistory: boolean = false;
	/**
	 * Defines wether or not the history is reset when the camera moves.
	 */
	public disableOnCameraMove: boolean = true;
	/**
	 * Kept for compatibility: the MSAA of Babylon Lite is configured when creating the engine.
	 */
	public msaaSamples: number = 1;

	private _isDisposed: boolean = false;

	public constructor(name: string, scene: SceneContext, cameras: Camera[]) {
		this.name = name;
		this.scene = scene;
		this.cameras = cameras;
	}

	/**
	 * Returns wether or not the pipeline has been disposed.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Returns the class name of the pipeline.
	 */
	public getClassName(): string {
		return "TAARenderingPipeline";
	}

	/**
	 * Disposes the pipeline: the temporal anti-aliasing is disabled.
	 */
	public dispose(): void {
		this._isDisposed = true;
	}
}

let taaRenderingPipeline: TAARenderingPipeline | null = null;

_registerRenderingSettingsProvider((scene) => {
	const pipeline = taaRenderingPipeline;
	if (!pipeline || pipeline.isDisposed || pipeline.scene !== scene) {
		return null;
	}

	return {
		taaEnabled: pipeline.isEnabled,
		taaFactor: pipeline.factor,
		taaSamples: pipeline.samples,
		taaDisableOnCameraMove: pipeline.disableOnCameraMove,
	};
});

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

export function createTAARenderingPipeline(scene: SceneContext, camera: Camera, options?: IRenderingOptions): TAARenderingPipeline {
	taaRenderingPipeline = new TAARenderingPipeline("TAARenderingPipeline", scene, [camera]);
	taaRenderingPipeline.msaaSamples = options?.msaaSamples ?? 1;

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

export function parseTAARenderingPipeline(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): TAARenderingPipeline {
	const pipeline = taaRenderingPipeline ?? createTAARenderingPipeline(scene, camera, options);
	pipeline.msaaSamples = options?.msaaSamples ?? 1;

	pipeline.factor = data.factor;
	pipeline.samples = data.samples ?? pipeline.samples;
	pipeline.clampHistory = data.clampHistory;
	pipeline.reprojectHistory = data.reprojectHistory;
	pipeline.disableOnCameraMove = data.disableOnCameraMove;

	if (!isEditorSceneContext(scene)) {
		warnOnce("taa-editor-scene", "the TAA rendering pipeline is rendered only by the scenes created using createEditorSceneContext.");
	}

	_requestRenderingStages(scene, {
		taa: true,
		taaSamples: pipeline.samples,
	});

	return pipeline;
}
