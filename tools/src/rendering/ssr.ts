import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { SSRRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline";

let ssrRenderingPipeline: SSRRenderingPipeline | null = null;

/**
 * Defines the configuration of the ssr rendering pipeline per camera.
 */
export const ssrRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getSSRRenderingPipeline(): SSRRenderingPipeline | null {
    return ssrRenderingPipeline;
}

/**
 * Sets the reference to the ssr rendering pipeline.
 * @access editor only.
 */
export function setSSRRenderingPipelineRef(pipeline: SSRRenderingPipeline | null): void {
    ssrRenderingPipeline = pipeline;
}

export function disposeSSRRenderingPipeline(): void {
    if (ssrRenderingPipeline) {
        ssrRenderingPipeline.dispose();
        ssrRenderingPipeline = null;
    }
}

export function createSSRRenderingPipeline(scene: Scene, camera: Camera): SSRRenderingPipeline {
    ssrRenderingPipeline = new SSRRenderingPipeline("SSRRenderingPipeline", scene, [camera]);
    ssrRenderingPipeline.samples = 4;

    return ssrRenderingPipeline;
}

export function serializeSSRRenderingPipeline(): any {
    if (!ssrRenderingPipeline) {
        return null;
    }

    return {
        samples: ssrRenderingPipeline.samples,

        step: ssrRenderingPipeline.step,
        thickness: ssrRenderingPipeline.thickness,
        strength: ssrRenderingPipeline.strength,
        reflectionSpecularFalloffExponent: ssrRenderingPipeline.reflectionSpecularFalloffExponent,
        maxSteps: ssrRenderingPipeline.maxSteps,
        maxDistance: ssrRenderingPipeline.maxDistance,

        roughnessFactor: ssrRenderingPipeline.roughnessFactor,
        reflectivityThreshold: ssrRenderingPipeline.reflectivityThreshold,
        blurDispersionStrehgth: ssrRenderingPipeline.blurDispersionStrength,

        clipToFrustum: ssrRenderingPipeline.clipToFrustum,
        enableSmoothReflections: ssrRenderingPipeline.enableSmoothReflections,
        enableAutomaticThicknessComputation: ssrRenderingPipeline.enableAutomaticThicknessComputation,
        attenuateFacingCamera: ssrRenderingPipeline.attenuateFacingCamera,
        attenuateScreenBorders: ssrRenderingPipeline.attenuateScreenBorders,
        attenuateIntersectionDistance: ssrRenderingPipeline.attenuateIntersectionDistance,
        attenuateBackfaceReflection: ssrRenderingPipeline.attenuateBackfaceReflection,

        blurDownsample: ssrRenderingPipeline.blurDownsample,
        selfCollisionNumSkip: ssrRenderingPipeline.selfCollisionNumSkip,
        ssrDownsample: ssrRenderingPipeline.ssrDownsample,
        backfaceDepthTextureDownsample: ssrRenderingPipeline.backfaceDepthTextureDownsample,
    };
}

export function parseSSRRenderingPipeline(scene: Scene, camera: Camera, data: any): SSRRenderingPipeline {
    if (ssrRenderingPipeline) {
        return ssrRenderingPipeline;
    }

    const pipeline = createSSRRenderingPipeline(scene, camera);

    pipeline.samples = data.samples;

    pipeline.step = data.step;
    pipeline.thickness = data.thickness;
    pipeline.strength = data.strength;
    pipeline.reflectionSpecularFalloffExponent = data.reflectionSpecularFalloffExponent;
    pipeline.maxSteps = data.maxSteps;
    pipeline.maxDistance = data.maxDistance;

    pipeline.roughnessFactor = data.roughnessFactor;
    pipeline.reflectivityThreshold = data.reflectivityThreshold;
    pipeline.blurDispersionStrength = data.blurDispersionStrehgth;

    pipeline.clipToFrustum = data.clipToFrustum;
    pipeline.enableSmoothReflections = data.enableSmoothReflections;
    pipeline.enableAutomaticThicknessComputation = data.enableAutomaticThicknessComputation;
    pipeline.attenuateFacingCamera = data.attenuateFacingCamera;
    pipeline.attenuateScreenBorders = data.attenuateScreenBorders;
    pipeline.attenuateIntersectionDistance = data.attenuateIntersectionDistance;
    pipeline.attenuateBackfaceReflection = data.attenuateBackfaceReflection;

    pipeline.blurDownsample = data.blurDownsample;
    pipeline.selfCollisionNumSkip = data.selfCollisionNumSkip;
    pipeline.ssrDownsample = data.ssrDownsample;
    pipeline.backfaceDepthTextureDownsample = data.backfaceDepthTextureDownsample;

    return pipeline;
}
