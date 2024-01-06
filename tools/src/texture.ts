import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Camera } from "@babylonjs/core/Cameras/camera";

import { isMesh, isTexture } from "./guards";

const sceneMap = new Map<Scene, () => void>();

export function startTextureOptimizer(scene: Scene): void {
    const engine = scene.getEngine();

    const existingRenderLoop = sceneMap.get(scene);
    if (existingRenderLoop) {
        engine.stopRenderLoop(existingRenderLoop);
    }

    let time = 0;
    const renderLoop = () => {
        const camera = scene.activeCamera;

        time += engine.getDeltaTime();
        if (!camera || time < 1000) {
            return;
        }

        scene.meshes.forEach((mesh) => {
            if (!isMesh(mesh) || !mesh.material) {
                return;
            }

            handleMesh(camera, mesh);
        });

        time = 0;
    };

    sceneMap.set(scene, renderLoop);
    engine.runRenderLoop(renderLoop);
}

function handleMesh(camera: Camera, mesh: Mesh): void {
    const material = mesh.material!;
    const textures = material.getActiveTextures();

    if (!textures.length) {
        return;
    }

    let isInFrustrum = false;
    if (mesh.instances.length) {
        isInFrustrum = [mesh, ...mesh.instances].find((instance) => camera.isInFrustum(instance)) ? true : false;
    } else {
        isInFrustrum = camera.isInFrustum(mesh);
    }

    textures.forEach((texture) => {
        if (!isTexture(texture) || !texture.getInternalTexture() || !texture.isReady()) {
            return;
        }

        texture.metadata ??= {};
        texture.metadata.editor ??= {
            ratio: 1,
            url: texture.getInternalTexture()?.url,
        };

        const url = texture.metadata.editor.url as string | undefined;
        if (!url) {
            return;
        }

        let ratio = texture.metadata.editor.ratio as number;

        if (isInFrustrum && ratio === 1) {
            return;
        }

        let split = url.split("/");
        const dirname = split.slice(0, -1).join("/");

        const basename = split[split.length - 1];
        split = basename.split(".");

        ratio *= (isInFrustrum ? 2 : 0.5);

        const width = texture.getBaseSize().width * ratio;
        const height = texture.getBaseSize().height * ratio;

        if (!isInFrustrum && (width <= 8 || height <= 8)) {
            return;
        }

        if (ratio === 1 && texture.getInternalTexture()!.url !== url) {
            texture.updateURL(url);
        } else if (ratio < 1) {
            const newUrl = `${dirname}/${split[0]}_${width}_${height}.${split[1]}`;
            texture.updateURL(newUrl);
        }

        texture.metadata.editor.ratio = ratio;
    });
}
