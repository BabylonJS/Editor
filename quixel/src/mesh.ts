import { copyFile } from "fs-extra";
import { join, basename } from "path/posix";

import { Mesh, Tools } from "babylonjs";
import { Editor } from "babylonjs-editor";

import { isMesh } from "./tools/guards";
import { UniqueNumber } from "./tools/id";

import { QuixelJsonType } from "./typings";

export async function importMeshes(editor: Editor, json: QuixelJsonType, assetsFolder: string): Promise<Mesh[]> {
    if (!editor.state.projectPath) {
        return [];
    }

    const results = await Promise.all(json.lodList.filter((lod) => lod.lod !== "high").map(async (lod) => {
        const path = lod.path.replace(/\\/g, "/");
        await copyFile(path, join(assetsFolder, basename(path)));
        return editor.layout.preview.importSceneFile(path, false);
    }));

    if (!results.length) {
        return [];
    }

    const sourceMeshes = results[0]?.meshes;
    if (!sourceMeshes) {
        return [];
    }

    sourceMeshes.forEach((mesh) => {
        mesh.id = Tools.RandomId();
        mesh.uniqueId = UniqueNumber.Get();
    });

    results[0]!.transformNodes.forEach((transformNode) => transformNode.dispose(true, false));

    for (let i = 1; i < results.length; ++i) {
        const result = results[i];
        if (!result) {
            continue;
        }

        result.meshes.forEach((mesh, lodIndex) => {
            mesh.id = Tools.RandomId();
            mesh.uniqueId = UniqueNumber.Get();

            if (!isMesh(mesh)) {
                return;
            }

            const sourceMesh = sourceMeshes[lodIndex];
            if (!sourceMesh || !isMesh(sourceMesh)) {
                return;
            }

            sourceMesh.addLODLevel(600 * i, mesh);
        });

        result.transformNodes.forEach((transformNode) => transformNode.dispose(true, false));
    }

    return results[0]!.meshes as Mesh[];
}
