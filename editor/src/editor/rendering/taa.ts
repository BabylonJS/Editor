import { TAARenderingPipeline, Camera } from "babylonjs";
import { Editor } from "../main";

let taaRenderingPipeline: TAARenderingPipeline | null = null;

/**
 * Defines the configuration of the TAA rendering pipeline per camera.
 */
export const taaPipelineCameraConfigurations = new Map<Camera, any>();

export function getTAARenderingPipeline(): TAARenderingPipeline | null {
	return taaRenderingPipeline;
}

export function disposeTAARenderingPipeline(): void {
	if (taaRenderingPipeline) {
		taaRenderingPipeline.dispose();
		taaRenderingPipeline = null;
	}
}

export function createTAARenderingPipeline(editor: Editor): TAARenderingPipeline {
	taaRenderingPipeline = new TAARenderingPipeline("TAARenderingPipeline", editor.layout.preview.scene, [editor.layout.preview.scene.activeCamera!]);
	taaRenderingPipeline.samples = 16;
	taaRenderingPipeline.disableOnCameraMove = false;
	taaRenderingPipeline.reprojectHistory = true;
	taaRenderingPipeline.clampHistory = true;

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

export function parseTAARenderingPipeline(editor: Editor, data: any): TAARenderingPipeline {
	const taaRenderingPipeline = getTAARenderingPipeline() ?? createTAARenderingPipeline(editor);

	taaRenderingPipeline.factor = data.factor;
	taaRenderingPipeline.samples = data.samples;
	taaRenderingPipeline.clampHistory = data.clampHistory;
	taaRenderingPipeline.reprojectHistory = data.reprojectHistory;
	taaRenderingPipeline.disableOnCameraMove = data.disableOnCameraMove;

	return taaRenderingPipeline;
}
