import { VolumetricLightScatteringPostProcess, Vector3, Mesh, Texture } from "babylonjs";

import { isMesh } from "../../tools/guards/nodes";

import { Editor } from "../main";

let vlsPostProcess: VolumetricLightScatteringPostProcess | null = null;

export function getVLSPostProcess(): VolumetricLightScatteringPostProcess | null {
    return vlsPostProcess;
}

export function disposeVLSPostProcess(editor: Editor): void {
    const activeCamera = editor.layout.preview.scene.activeCamera;

    if (vlsPostProcess && activeCamera) {
        vlsPostProcess.dispose(activeCamera);
        vlsPostProcess = null;
    }
}

export function createVLSPostProcess(editor: Editor, mesh?: Mesh | null): VolumetricLightScatteringPostProcess {
    const scene = editor.layout.preview.scene;
    mesh ??= scene.meshes.find((mesh) => isMesh(mesh)) as Mesh;

    vlsPostProcess = new VolumetricLightScatteringPostProcess("VolumetricLightScatteringPostProcess", 1.0, scene.activeCamera, mesh, 100, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false);

    return vlsPostProcess;
}

export function serializeVLSPostProcess(): any {
    if (!vlsPostProcess) {
        return null;
    }

    return {
        meshId: vlsPostProcess.mesh?.id,
        exposure: vlsPostProcess.exposure,
        decay: vlsPostProcess.decay,
        weight: vlsPostProcess.weight,
        density: vlsPostProcess.density,
        invert: vlsPostProcess.invert,
        useCustomMeshPosition: vlsPostProcess.useCustomMeshPosition,
        customMeshPosition: vlsPostProcess.customMeshPosition.asArray(),
    };
}

export function parseVLSPostProcess(editor: Editor, data: any): VolumetricLightScatteringPostProcess {
    let mesh: Mesh | null = null;

    if (data.meshId) {
        const result = editor.layout.preview.scene.getMeshById(data.meshId);
        if (result && isMesh(result)) {
            mesh = result;
        }
    }

    const vlsPostProcess = createVLSPostProcess(editor, mesh);

    vlsPostProcess.exposure = data.exposure;
    vlsPostProcess.decay = data.decay;
    vlsPostProcess.weight = data.weight;
    vlsPostProcess.density = data.density;
    vlsPostProcess.invert = data.invert;
    vlsPostProcess.useCustomMeshPosition = data.useCustomMeshPosition;
    vlsPostProcess.customMeshPosition.copyFrom(Vector3.FromArray(data.customMeshPosition));

    return vlsPostProcess;
}
