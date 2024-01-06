import { isAbsolute } from "path";
import { join, dirname, basename } from "path/posix";

import { CubeTexture, Node, Scene, SceneLoader, Texture, Tools } from "babylonjs";

import { UniqueNumber } from "../../../tools/tools";
import { isTexture } from "../../../tools/guards/texture";
import { onNodesAddedObservable } from "../../../tools/observables";

import { projectConfiguration } from "../../../project/configuration";

export async function loadImportedSceneFile(scene: Scene, absolutePath: string): Promise<void> {
    if (!projectConfiguration.path) {
        return;
    }

    const result = await SceneLoader.ImportMeshAsync(
        "",
        join(dirname(absolutePath), "/"),
        basename(absolutePath),
        scene,
    );

    result.meshes.forEach((mesh) => configureImportedNodeIds(mesh));
    result.lights.forEach((light) => configureImportedNodeIds(light));
    result.transformNodes.forEach((transformNode) => configureImportedNodeIds(transformNode));

    scene.lights.forEach((light) => {
        const shadowMap = light.getShadowGenerator()?.getShadowMap();
        if (!shadowMap?.renderList) {
            return;
        }

        result.meshes.forEach((mesh) => {
            shadowMap.renderList!.push(mesh);
        });
    });

    result.meshes.forEach((mesh) => {
        const textures = mesh.material?.getActiveTextures();
        if (!textures?.length) {
            return;
        }

        textures.forEach((texture) => {
            if (isTexture(texture)) {
                configureImportedTexture(texture);
            }
        });
    });

    onNodesAddedObservable.notifyObservers();
}

export function configureImportedNodeIds(node: Node): void {
    node.id = Tools.RandomId();
    node.uniqueId = UniqueNumber.Get();
}

export function configureImportedTexture(texture: Texture | CubeTexture): Texture | CubeTexture {
    if (isAbsolute(texture.name)) {
        texture.name = texture.name.replace(join(dirname(projectConfiguration.path!), "/"), "");
    }

    return texture;
}
