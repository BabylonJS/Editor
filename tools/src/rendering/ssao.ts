import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";

let ssaoRenderingPipeline: SSAO2RenderingPipeline | null = null;

export function getSSAO2RenderingPipeline(): SSAO2RenderingPipeline | null {
    return ssaoRenderingPipeline;
}

export function disposeSSAO2RenderingPipeline(): void {
    if (ssaoRenderingPipeline) {
        ssaoRenderingPipeline.dispose();
        ssaoRenderingPipeline = null;
    }
}

export function createSSAO2RenderingPipeline(scene: Scene, camera: Camera): SSAO2RenderingPipeline {
    ssaoRenderingPipeline = new SSAO2RenderingPipeline("SSAO2RenderingPipeline", scene, 1.0, [camera]);
    ssaoRenderingPipeline.samples = 4;

    return ssaoRenderingPipeline;
}

export function serializeSSAO2RenderingPipeline(): any {
    if (!ssaoRenderingPipeline) {
        return null;
    }

    return {
        radius: ssaoRenderingPipeline.radius,
        totalStrength: ssaoRenderingPipeline.totalStrength,
        samples: ssaoRenderingPipeline.samples,
        maxZ: ssaoRenderingPipeline.maxZ,
        minZAspect: ssaoRenderingPipeline.minZAspect,
        epsilon: ssaoRenderingPipeline.epsilon,
        textureSamples: ssaoRenderingPipeline.textureSamples,
        bypassBlur: ssaoRenderingPipeline.bypassBlur,
        bilateralSamples: ssaoRenderingPipeline.bilateralSamples,
        bilateralSoften: ssaoRenderingPipeline.bilateralSoften,
        bilateralTolerance: ssaoRenderingPipeline.bilateralTolerance,
        expensiveBlur: ssaoRenderingPipeline.expensiveBlur,
    };
}

export function parseSSAO2RenderingPipeline(scene: Scene, camera: Camera, data: any): SSAO2RenderingPipeline {
    const ssao2RenderingPipeline = createSSAO2RenderingPipeline(scene, camera);

    ssao2RenderingPipeline.radius = data.radius;
    ssao2RenderingPipeline.totalStrength = data.totalStrength;
    ssao2RenderingPipeline.samples = data.samples;
    ssao2RenderingPipeline.maxZ = data.maxZ;
    ssao2RenderingPipeline.minZAspect = data.minZAspect;
    ssao2RenderingPipeline.epsilon = data.epsilon;
    ssao2RenderingPipeline.textureSamples = data.textureSamples;
    ssao2RenderingPipeline.bypassBlur = data.bypassBlur;
    ssao2RenderingPipeline.bilateralSamples = data.bilateralSamples;
    ssao2RenderingPipeline.bilateralSoften = data.bilateralSoften;
    ssao2RenderingPipeline.bilateralTolerance = data.bilateralTolerance;
    ssao2RenderingPipeline.expensiveBlur = data.expensiveBlur;

    return ssao2RenderingPipeline;
}