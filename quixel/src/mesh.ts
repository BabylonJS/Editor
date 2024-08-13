import { join, basename } from "path/posix";
import { copyFile, writeJson } from "fs-extra";

import { Editor } from "babylonjs-editor";
import { Mesh, SceneSerializer, Tools } from "babylonjs";

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

export async function saveMeshesAsBabylonFormat(meshes: Mesh[], assetFolder: string): Promise<void> {
    meshes.forEach((mesh) => {
        if (mesh._masterMesh) {
            return;
        }

        try {
            const json = SceneSerializer.SerializeMesh(mesh, false, false);
            json.materials = [];
            json.multiMaterials = [];

            const jsonMesh = json.meshes[0];
            jsonMesh.lodMeshIds = [];
            jsonMesh.lodDistances = [];
            jsonMesh.lodCoverages = [];

            mesh.id = Tools.RandomId();
            mesh.uniqueId = UniqueNumber.Get();

            for (const lod of mesh.getLODLevels()) {
                if (lod.mesh) {
                    const lodJson = SceneSerializer.SerializeMesh(lod.mesh, false, false);

                    json.meshes.push(...lodJson.meshes);
                    json.geometries.vertexData.push(...lodJson.geometries.vertexData);

                    jsonMesh.lodMeshIds.push(lod.mesh.id);
                    jsonMesh.lodDistances.push(lod.distanceOrScreenCoverage);
                    jsonMesh.lodCoverages.push(lod.distanceOrScreenCoverage);

                    lod.mesh.id = Tools.RandomId();
                    lod.mesh.uniqueId = UniqueNumber.Get();
                }
            }

            const firstMesh = json.meshes.shift();
            json.meshes.push(firstMesh);

            writeJson(join(assetFolder, `${mesh.name}.babylon`), json);
        } catch (e) {
            // Catch silently.   
        }
    });
}
