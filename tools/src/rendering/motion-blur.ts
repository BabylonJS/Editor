import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { MotionBlurPostProcess } from "@babylonjs/core/PostProcesses/motionBlurPostProcess";

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

export function createMotionBlurPostProcess(scene: Scene, camera: Camera): MotionBlurPostProcess {
    motionBlurPostProcess = new MotionBlurPostProcess("MotionBlurPostProcess", scene, 1.0, camera);
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

export function parseMotionBlurPostProcess(scene: Scene, camera: Camera, data: any): MotionBlurPostProcess {
    if (motionBlurPostProcess) {
        return motionBlurPostProcess;
    }

    const postProcess = createMotionBlurPostProcess(scene, camera);

    postProcess.isObjectBased = data.isObjectBased;
    postProcess.motionStrength = data.motionStrength;
    postProcess.motionBlurSamples = data.motionBlurSamples;

    return postProcess;
}
