import { IblShadowsRenderPipeline } from "babylonjs";

import { Editor } from "../main";

import { updateIblShadowsRenderPipeline } from "../../tools/light/ibl";

let iblShadowsRenderingPipeline: IblShadowsRenderPipeline | null = null;

/**
 * Defines the configuration of the IBL shadows rendering pipeline per camera.
 */
export const iblShadowsRenderingPipelineCameraConfigurations = new Map<any, any>();

export function getIblShadowsRenderingPipeline(): IblShadowsRenderPipeline | null {
    return iblShadowsRenderingPipeline;
}

export function disposeIblShadowsRenderingPipeline(): void {
    if (iblShadowsRenderingPipeline) {
        iblShadowsRenderingPipeline.dispose();
        iblShadowsRenderingPipeline = null;
    }
}

export function createIblShadowsRenderingPipeline(editor: Editor): IblShadowsRenderPipeline {
    const scene = editor.layout.preview.scene;

    const geometryBufferRenderer = scene.enableGeometryBufferRenderer();
    if (geometryBufferRenderer) {
        geometryBufferRenderer.enableScreenspaceDepth = true;
        geometryBufferRenderer.enableDepth = false;
        geometryBufferRenderer.generateNormalsInWorldSpace = false;
    }

    scene.enableIblCdfGenerator();

    iblShadowsRenderingPipeline = new IblShadowsRenderPipeline("iblShadowsPipeline", scene, {
        resolutionExp: 7,
        sampleDirections: 2,
        ssShadowsEnabled: true,
        shadowRemanence: 0.8,
        triPlanarVoxelization: true,
        shadowOpacity: 1.0
    }, [scene.activeCamera!]);

    iblShadowsRenderingPipeline.addShadowReceivingMaterial();

    updateIblShadowsRenderPipeline(scene);

    return iblShadowsRenderingPipeline;
}

export function serializeIblShadowsRenderingPipeline(): any {
    if (!iblShadowsRenderingPipeline) {
        return null;
    }

    return {
        resolutionExp: iblShadowsRenderingPipeline.resolutionExp,
        sampleDirections: iblShadowsRenderingPipeline.sampleDirections,
        shadowRemanence: iblShadowsRenderingPipeline.shadowRemanence,
        shadowOpacity: iblShadowsRenderingPipeline.shadowOpacity,
    };
}

export function parseIblShadowsRenderingPipeline(editor: Editor, data: any): IblShadowsRenderPipeline {
    const iblShadowsRenderingPipeline = getIblShadowsRenderingPipeline() ?? createIblShadowsRenderingPipeline(editor);

    iblShadowsRenderingPipeline.resolutionExp = data.resolutionExp;
    iblShadowsRenderingPipeline.sampleDirections = data.sampleDirections;
    iblShadowsRenderingPipeline.shadowRemanence = data.shadowRemanence;
    iblShadowsRenderingPipeline.shadowOpacity = data.shadowOpacity;

    return iblShadowsRenderingPipeline;
}
