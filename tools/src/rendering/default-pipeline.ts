import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

let defaultRenderingPipeline: DefaultRenderingPipeline | null = null;

/**
 * Returns the reference to the default rendering pipeline if exists.
 */
export function getDefaultRenderingPipeline(): DefaultRenderingPipeline | null {
    return defaultRenderingPipeline;
}

export function disposeDefaultRenderingPipeline(): void {
    if (defaultRenderingPipeline) {
        defaultRenderingPipeline.dispose();
        defaultRenderingPipeline = null;
    }
}

export function createDefaultRenderingPipeline(scene: Scene, camera: Camera): DefaultRenderingPipeline {
    defaultRenderingPipeline = new DefaultRenderingPipeline("DefaultRenderingPipeline", true, scene, [camera]);
    defaultRenderingPipeline.samples = 4;

    defaultRenderingPipeline.depthOfField.lensSize = 512;
    defaultRenderingPipeline.depthOfField.fStop = 0.25;
    defaultRenderingPipeline.depthOfField.focusDistance = 55_000;

    return defaultRenderingPipeline;
}

export function serializeDefaultRenderingPipeline(): any {
    if (!defaultRenderingPipeline) {
        return null;
    }

    return {
        samples: defaultRenderingPipeline.samples,
        fxaaEnabled: defaultRenderingPipeline.fxaaEnabled,

        imageProcessingEnabled: defaultRenderingPipeline.imageProcessingEnabled,
        exposure: defaultRenderingPipeline.imageProcessing?.exposure,
        contrast: defaultRenderingPipeline.imageProcessing?.contrast,
        fromLinearSpace: defaultRenderingPipeline.imageProcessing?.fromLinearSpace,
        toneMappingEnabled: defaultRenderingPipeline.imageProcessing?.toneMappingEnabled,
        toneMappingType: defaultRenderingPipeline.imageProcessing?.toneMappingType,
        ditheringEnabled: defaultRenderingPipeline.imageProcessing?.ditheringEnabled,
        ditheringIntensity: defaultRenderingPipeline.imageProcessing?.ditheringIntensity,

        bloomEnabled: defaultRenderingPipeline.bloomEnabled,
        bloomThreshold: defaultRenderingPipeline.bloomThreshold,
        bloomWeight: defaultRenderingPipeline.bloomWeight,
        bloomScale: defaultRenderingPipeline.bloomScale,
        bloomKernel: defaultRenderingPipeline.bloomKernel,

        sharpenEnabled: defaultRenderingPipeline.sharpenEnabled,
        sharpenEdgeAmount: defaultRenderingPipeline.sharpen.edgeAmount,
        sharpenColorAmount: defaultRenderingPipeline.sharpen.colorAmount,

        grainEnabled: defaultRenderingPipeline.grainEnabled,
        grainIntensity: defaultRenderingPipeline.grain.intensity,
        grainAnimated: defaultRenderingPipeline.grain.animated,

        depthOfFieldEnabled: defaultRenderingPipeline.depthOfFieldEnabled,
        depthOfFieldBlurLevel: defaultRenderingPipeline.depthOfFieldBlurLevel,
        lensSize: defaultRenderingPipeline.depthOfField.lensSize,
        fStop: defaultRenderingPipeline.depthOfField.fStop,
        focusDistance: defaultRenderingPipeline.depthOfField.focusDistance,
        focalLength: defaultRenderingPipeline.depthOfField.focalLength,
    };
}

export function parseDefaultRenderingPipeline(scene: Scene, camera: Camera, data: any): DefaultRenderingPipeline {
    if (defaultRenderingPipeline) {
        return defaultRenderingPipeline;
    }

    const pipeline = createDefaultRenderingPipeline(scene, camera);

    pipeline.samples = data.samples;
    pipeline.fxaaEnabled = data.fxaaEnabled;

    pipeline.imageProcessingEnabled = data.imageProcessingEnabled;
    if (pipeline.imageProcessing) {
        pipeline.imageProcessing.exposure = data.exposure;
        pipeline.imageProcessing.contrast = data.contrast;
        pipeline.imageProcessing.fromLinearSpace = data.fromLinearSpace;
        pipeline.imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
        pipeline.imageProcessing.toneMappingType = data.toneMappingType;
        pipeline.imageProcessing.ditheringEnabled = data.ditheringEnabled;
        pipeline.imageProcessing.ditheringIntensity = data.ditheringIntensity;
    }

    pipeline.bloomEnabled = data.bloomEnabled;
    pipeline.bloomThreshold = data.bloomThreshold;
    pipeline.bloomWeight = data.bloomWeight;
    pipeline.bloomScale = data.bloomScale;
    pipeline.bloomKernel = data.bloomKernel;

    pipeline.sharpenEnabled = data.sharpenEnabled;
    pipeline.sharpen.edgeAmount = data.sharpenEdgeAmount;
    pipeline.sharpen.colorAmount = data.sharpenColorAmount;

    pipeline.grainEnabled = data.grainEnabled;
    pipeline.grain.intensity = data.grainIntensity;
    pipeline.grain.animated = data.grainAnimated;

    pipeline.depthOfFieldEnabled = data.depthOfFieldEnabled;
    pipeline.depthOfFieldBlurLevel = data.depthOfFieldBlurLevel;
    pipeline.depthOfField.lensSize = data.lensSize;
    pipeline.depthOfField.fStop = data.fStop;
    pipeline.depthOfField.focusDistance = data.focusDistance;
    pipeline.depthOfField.focalLength = data.focalLength;

    return pipeline;
}
