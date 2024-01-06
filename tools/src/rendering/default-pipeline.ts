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
    const defaultRenderingPipeline = createDefaultRenderingPipeline(scene, camera);

    defaultRenderingPipeline.samples = data.samples;
    defaultRenderingPipeline.fxaaEnabled = data.fxaaEnabled;

    defaultRenderingPipeline.imageProcessingEnabled = data.imageProcessingEnabled;
    if (defaultRenderingPipeline.imageProcessing) {
        defaultRenderingPipeline.imageProcessing.exposure = data.exposure;
        defaultRenderingPipeline.imageProcessing.contrast = data.contrast;
        defaultRenderingPipeline.imageProcessing.fromLinearSpace = data.fromLinearSpace;
        defaultRenderingPipeline.imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
        defaultRenderingPipeline.imageProcessing.toneMappingType = data.toneMappingType;
        defaultRenderingPipeline.imageProcessing.ditheringEnabled = data.ditheringEnabled;
        defaultRenderingPipeline.imageProcessing.ditheringIntensity = data.ditheringIntensity;
    }

    defaultRenderingPipeline.bloomEnabled = data.bloomEnabled;
    defaultRenderingPipeline.bloomThreshold = data.bloomThreshold;
    defaultRenderingPipeline.bloomWeight = data.bloomWeight;
    defaultRenderingPipeline.bloomScale = data.bloomScale;
    defaultRenderingPipeline.bloomKernel = data.bloomKernel;

    defaultRenderingPipeline.sharpenEnabled = data.sharpenEnabled;
    defaultRenderingPipeline.sharpen.edgeAmount = data.sharpenEdgeAmount;
    defaultRenderingPipeline.sharpen.colorAmount = data.sharpenColorAmount;

    defaultRenderingPipeline.grainEnabled = data.grainEnabled;
    defaultRenderingPipeline.grain.intensity = data.grainIntensity;
    defaultRenderingPipeline.grain.animated = data.grainAnimated;

    defaultRenderingPipeline.depthOfFieldEnabled = data.depthOfFieldEnabled;
    defaultRenderingPipeline.depthOfFieldBlurLevel = data.depthOfFieldBlurLevel;
    defaultRenderingPipeline.depthOfField.lensSize = data.lensSize;
    defaultRenderingPipeline.depthOfField.fStop = data.fStop;
    defaultRenderingPipeline.depthOfField.focusDistance = data.focusDistance;
    defaultRenderingPipeline.depthOfField.focalLength = data.focalLength;

    return defaultRenderingPipeline;
}
