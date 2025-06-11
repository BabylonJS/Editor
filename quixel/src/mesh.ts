import { join, basename } from "path/posix";
import { copyFile, writeJson } from "fs-extra";

import { Mesh, SceneSerializer, Tools } from "babylonjs";
import { Editor, isMesh, UniqueNumber } from "babylonjs-editor";

import { QuixelLodListType } from "./typings";

export async function importMeshes(editor: Editor, lodList: QuixelLodListType[], assetsFolder: string): Promise<Mesh[]> {
    if (!editor.state.projectPath) {
        return [];
    }

    const results = await Promise.all(lodList.filter((lod) => lod.lod !== "high").map(async (lod) => {
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

export async function saveMeshesAsBabylonFormat(editor: Editor, meshes: Mesh[], assetFolder: string, variation?: number): Promise<void> {
    await Promise.all(meshes.map(async (mesh) => {
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

            await writeJson(join(assetFolder, `${mesh.name}${variation ?? ""}.babylon`), json);

            editor.layout.console.log(`Successfully saved mesh as Babylon format: ${mesh.name}${variation ?? ""}.babylon`);
        } catch (e) {
            // Catch silently.   
        }
    }));
}
