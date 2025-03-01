import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";

let ssaoRenderingPipeline: SSAO2RenderingPipeline | null = null;

/**
 * Defines the configuration of the SSAO rendering pipeline per camera.
 */
export const ssaoRenderingPipelineCameraConfigurations = new Map<Camera, any>();

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
    if (ssaoRenderingPipeline) {
        return ssaoRenderingPipeline;
    }

    const pipeline = createSSAO2RenderingPipeline(scene, camera);

    pipeline.radius = data.radius;
    pipeline.totalStrength = data.totalStrength;
    pipeline.samples = data.samples;
    pipeline.maxZ = data.maxZ;
    pipeline.minZAspect = data.minZAspect;
    pipeline.epsilon = data.epsilon;
    pipeline.textureSamples = data.textureSamples;
    pipeline.bypassBlur = data.bypassBlur;
    pipeline.bilateralSamples = data.bilateralSamples;
    pipeline.bilateralSoften = data.bilateralSoften;
    pipeline.bilateralTolerance = data.bilateralTolerance;
    pipeline.expensiveBlur = data.expensiveBlur;

    return pipeline;
}
