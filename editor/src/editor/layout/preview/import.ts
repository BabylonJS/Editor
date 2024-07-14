import { isAbsolute } from "path";
import { join, dirname, basename } from "path/posix";
import { readFile, readJSON, writeFile } from "fs-extra";

import axios from "axios";
import { toast } from "sonner";

import { CubeTexture, ISceneLoaderAsyncResult, Material, Node, Scene, SceneLoader, Texture, Tools } from "babylonjs";

import { UniqueNumber } from "../../../tools/tools";
import { isMesh } from "../../../tools/guards/nodes";
import { isTexture } from "../../../tools/guards/texture";
import { onNodesAddedObservable } from "../../../tools/observables";

import { projectConfiguration } from "../../../project/configuration";

export async function tryConvertSceneFile(absolutePath: string, progress?: (percent: number) => void): Promise<string> {
    const toolsUrl = process.env.EDITOR_TOOLS_URL ?? "http://161.35.170.6:3000";
    const buffer = await readFile(absolutePath);
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const file = new File([blob], basename(absolutePath), { type: "application/octet-stream" });

    const form = new FormData();
    form.append("file", file);

    try {
        const { data } = await axios.post(`${toolsUrl}/api/converter`, form, {
            responseType: "arraybuffer",
            onUploadProgress: (event) => {
                if (event.progress) {
                    progress?.(event.progress * 100);
                }
            },
        });

        const destination = join(dirname(absolutePath), `editor-generated_${basename(absolutePath)}.glb`);
        await writeFile(destination, Buffer.from(data));

        return destination;
    } catch (e) {
        console.error(e);
        return "";
    }
}

export async function loadImportedSceneFile(scene: Scene, absolutePath: string, fromCloudConverter?: boolean): Promise<ISceneLoaderAsyncResult | null> {
    if (!projectConfiguration.path) {
        return null;
    }

    let result: ISceneLoaderAsyncResult;

    try {
        result = await SceneLoader.ImportMeshAsync(
            "",
            join(dirname(absolutePath), "/"),
            basename(absolutePath),
            scene,
        );
    } catch (e) {
        console.error(e);
        toast.error("Failed to load the scene file.");
        return null;
    }

    if (fromCloudConverter) {
        const root = result.meshes.find((m) => m.name === "__root__");
        root?.scaling.scaleInPlace(100);
    }

    result.meshes.forEach((mesh) => {
        configureImportedNodeIds(mesh);

        if (mesh.skeleton) {
            mesh.skeleton.id = Tools.RandomId();
            mesh.skeleton.bones.forEach((bone) => configureImportedNodeIds(bone));
        }
    });

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

    const configuredEmbeddedTextures: number[] = [];

    result.meshes.forEach((mesh) => {
        if (isMesh(mesh) && mesh.geometry) {
            mesh.geometry.id = Tools.RandomId();
            mesh.geometry.uniqueId = UniqueNumber.Get();
        }

        const textures = mesh.material?.getActiveTextures();
        if (!textures?.length) {
            return;
        }

        textures.forEach((texture) => {
            if (isTexture(texture)) {
                if (configuredEmbeddedTextures.includes(texture.uniqueId)) {
                    return;
                }

                configuredEmbeddedTextures.push(texture.uniqueId);

                configureImportedTexture(texture);
                configureEmbeddedTexture(texture, absolutePath);
            }
        });
    });

    onNodesAddedObservable.notifyObservers();

    return result;
}

export function configureImportedNodeIds(node: Node): void {
    node.id = Tools.RandomId();
    node.uniqueId = UniqueNumber.Get();
}

export function configureImportedTexture(texture: Texture | CubeTexture): Texture | CubeTexture {
    if (isAbsolute(texture.name)) {
        texture.name = texture.name.replace(join(dirname(projectConfiguration.path!), "/"), "");
        texture.url = texture.name;
    }

    return texture;
}

export async function configureEmbeddedTexture(texture: Texture, absolutePath: string): Promise<void> {
    if (!texture._buffer || !texture.mimeType || !projectConfiguration.path) {
        return;
    }

    let extension = "";
    switch (texture.mimeType) {
        case "image/png": extension = "png"; break;
        case "image/gif": extension = "gif"; break;
        case "image/jpeg": extension = "jpg"; break;
        case "image/bmp": extension = "bmp"; break;
        default: return;
    }

    let buffer: Buffer;
    if (typeof (texture._buffer) === "string") {
        const byteString = atob(texture._buffer);
        const ab = new ArrayBuffer(byteString.length);

        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        buffer = Buffer.from(ia);
    } else {
        buffer = Buffer.from(texture._buffer as Uint8Array);
    }

    const filename = join(dirname(absolutePath), `editor-generated_${texture.name}_${Tools.RandomId()}.${extension}`);
    await writeFile(filename, buffer);

    const relativePath = filename.replace(join(dirname(projectConfiguration.path!), "/"), "");
    texture.name = relativePath;
    texture.url = relativePath;

    texture._buffer = null;
}

export async function loadImportedMaterial(scene: Scene, absolutePath: string): Promise<Material | null> {
    if (!projectConfiguration.path) {
        return null;
    }

    const data = await readJSON(absolutePath);
    const uniqueId = data.uniqueId;

    const existingMaterial = scene.materials.find((material) => material.uniqueId === uniqueId);
    if (existingMaterial) {
        return existingMaterial;
    }

    const material = Material.Parse(data, scene, join(dirname(projectConfiguration.path!), "/"));
    if (!material) {
        return null;
    }

    material.uniqueId = uniqueId;

    return material;
}
