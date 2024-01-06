import { MotionBlurPostProcess } from "babylonjs";

import { Editor } from "../main";

let motionBlurPostProcess: MotionBlurPostProcess | null = null;

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
    motionBlurPostProcess = new MotionBlurPostProcess("MotionBlurPostProcess", editor.layout.preview.scene, 1.0, editor.layout.preview.camera);
    motionBlurPostProcess.motionStrength = 1.0;
    motionBlurPostProcess.isObjectBased = true;

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

export function parseMotionBlurPostProcess(editor: Editor, data: any): MotionBlurPostProcess {
    const motionBlurPostProcess = createMotionBlurPostProcess(editor);

    motionBlurPostProcess.isObjectBased = data.isObjectBased;
    motionBlurPostProcess.motionStrength = data.motionStrength;
    motionBlurPostProcess.motionBlurSamples = data.motionBlurSamples;

    return motionBlurPostProcess;
}
