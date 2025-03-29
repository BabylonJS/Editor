import { SSRRenderingPipeline, Camera } from "babylonjs";

import { Editor } from "../main";

let ssrRenderingPipeline: SSRRenderingPipeline | null = null;

/**
 * Defines the configuration of the ssr rendering pipeline per camera.
 */
export const ssrRenderingPipelineCameraConfigurations = new Map<Camera, any>();

export function getSSRRenderingPipeline(): SSRRenderingPipeline | null {
    return ssrRenderingPipeline;
}

export function disposeSSRRenderingPipeline(): void {
    if (ssrRenderingPipeline) {
        ssrRenderingPipeline.dispose();
        ssrRenderingPipeline = null;
    }
}

export function createSSRRenderingPipeline(editor: Editor): SSRRenderingPipeline {
    ssrRenderingPipeline = new SSRRenderingPipeline("SSRRenderingPipeline", editor.layout.preview.scene, [editor.layout.preview.scene.activeCamera!], true);
    ssrRenderingPipeline.samples = 16;

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

export function parseSSRRenderingPipeline(editor: Editor, data: any): SSRRenderingPipeline {
    const ssrRenderingPipeline = getSSRRenderingPipeline() ?? createSSRRenderingPipeline(editor);

    ssrRenderingPipeline.samples = data.samples;

    ssrRenderingPipeline.step = data.step;
    ssrRenderingPipeline.thickness = data.thickness;
    ssrRenderingPipeline.strength = data.strength;
    ssrRenderingPipeline.reflectionSpecularFalloffExponent = data.reflectionSpecularFalloffExponent;
    ssrRenderingPipeline.maxSteps = data.maxSteps;
    ssrRenderingPipeline.maxDistance = data.maxDistance;

    ssrRenderingPipeline.roughnessFactor = data.roughnessFactor;
    ssrRenderingPipeline.reflectivityThreshold = data.reflectivityThreshold;
    ssrRenderingPipeline.blurDispersionStrength = data.blurDispersionStrehgth;

    ssrRenderingPipeline.clipToFrustum = data.clipToFrustum;
    ssrRenderingPipeline.enableSmoothReflections = data.enableSmoothReflections;
    ssrRenderingPipeline.enableAutomaticThicknessComputation = data.enableAutomaticThicknessComputation;
    ssrRenderingPipeline.attenuateFacingCamera = data.attenuateFacingCamera;
    ssrRenderingPipeline.attenuateScreenBorders = data.attenuateScreenBorders;
    ssrRenderingPipeline.attenuateIntersectionDistance = data.attenuateIntersectionDistance;
    ssrRenderingPipeline.attenuateBackfaceReflection = data.attenuateBackfaceReflection;

    ssrRenderingPipeline.blurDownsample = data.blurDownsample;
    ssrRenderingPipeline.selfCollisionNumSkip = data.selfCollisionNumSkip;
    ssrRenderingPipeline.ssrDownsample = data.ssrDownsample;
    ssrRenderingPipeline.backfaceDepthTextureDownsample = data.backfaceDepthTextureDownsample;

    return ssrRenderingPipeline;
}
