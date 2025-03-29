import { MotionBlurPostProcess, Camera } from "babylonjs";

import { Editor } from "../main";

let motionBlurPostProcess: MotionBlurPostProcess | null = null;

/**
 * Defines the configuration of the motion blur post-process per camera.
 */
export const motionBlurPostProcessCameraConfigurations = new Map<Camera, any>();

export function getMotionBlurPostProcess(): MotionBlurPostProcess | null {
    return motionBlurPostProcess;
}

export function disposeMotionBlurPostProcess(): void {
    if (motionBlurPostProcess) {
        motionBlurPostProcess.dispose();
        motionBlurPostProcess = null;
    }
}

export function createMotionBlurPostProcess(editor: Editor): MotionBlurPostProcess {
    motionBlurPostProcess = new MotionBlurPostProcess("MotionBlurPostProcess", editor.layout.preview.scene, 1.0, editor.layout.preview.scene.activeCamera, undefined, undefined, undefined, undefined, undefined, true);
    motionBlurPostProcess.samples = 16;
    motionBlurPostProcess.motionStrength = 1.0;
    motionBlurPostProcess.isObjectBased = true;

    return motionBlurPostProcess;
}

export function serializeMotionBlurPostProcess(): any {
    if (!motionBlurPostProcess) {
        return null;
    }

    return {
        samples: motionBlurPostProcess.samples,
        isObjectBased: motionBlurPostProcess.isObjectBased,
        motionStrength: motionBlurPostProcess.motionStrength,
        motionBlurSamples: motionBlurPostProcess.motionBlurSamples,
    };
}

export function parseMotionBlurPostProcess(editor: Editor, data: any): MotionBlurPostProcess {
    const motionBlurPostProcess = getMotionBlurPostProcess() ?? createMotionBlurPostProcess(editor);

    motionBlurPostProcess.isObjectBased = data.isObjectBased;
    motionBlurPostProcess.motionStrength = data.motionStrength;
    motionBlurPostProcess.motionBlurSamples = data.motionBlurSamples;

    if (data.samples) {
        motionBlurPostProcess.samples = data.samples;
    }

    return motionBlurPostProcess;
}
