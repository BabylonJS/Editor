import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { VolumetricLightScatteringPostProcess } from "@babylonjs/core/PostProcesses/volumetricLightScatteringPostProcess";

import { isMesh } from "../guards";

let vlsPostProcess: VolumetricLightScatteringPostProcess | null = null;

export function getVLSPostProcess(): VolumetricLightScatteringPostProcess | null {
    return vlsPostProcess;
}

export function disposeVLSPostProcess(scene: Scene): void {
    if (vlsPostProcess && scene.activeCamera) {
        vlsPostProcess.dispose(scene.activeCamera);
        vlsPostProcess = null;
    }
}

export function createVLSPostProcess(scene: Scene, mesh?: Mesh | null): VolumetricLightScatteringPostProcess {
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

export function parseVLSPostProcess(scene: Scene, data: any): VolumetricLightScatteringPostProcess {
    let mesh: Mesh | null = null;

    if (data.meshId) {
        const result = scene.getMeshById(data.meshId);
        if (result && isMesh(result)) {
            mesh = result;
        }
    }

    const vlsPostProcess = createVLSPostProcess(scene, mesh);

    vlsPostProcess.exposure = data.exposure;
    vlsPostProcess.decay = data.decay;
    vlsPostProcess.weight = data.weight;
    vlsPostProcess.density = data.density;
    vlsPostProcess.invert = data.invert;
    vlsPostProcess.useCustomMeshPosition = data.useCustomMeshPosition;
    vlsPostProcess.customMeshPosition.copyFrom(Vector3.FromArray(data.customMeshPosition));

    return vlsPostProcess;
}
