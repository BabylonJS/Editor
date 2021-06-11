import { join } from "path";
import { createWriteStream } from "fs";

import { Editor } from "../editor";

export class GeometryExporter {
    /**
     * Exports all the geometries of the given serialized scene to their incremental form.
     * @param editor defines the reference to the editor.
     * @param path defines the absolute path where to export all the geometries of the given scene.
     * @param scene defines the reference to the serialized scene to export its geometries.
     * @param finalExport defines wether or not this export is the final export (generating scene or saving project?).
     * @param overridePath defines the optional path to set before the "geometries/" folder.
     * @param task defines the reference to the optional task used to notify feedbacks to the user about export progress.
     * @returns the list of all geometry files that have been created.
     */
    public static async ExportIncrementalGeometries(editor: Editor, path: string, scene: any, finalExport: boolean, overridePath?: string, task?: string): Promise<string[]> {
        if (task) {
            editor.updateTaskFeedback(task, 0, "Exporting incremental files...");
        }

        const result: string[] = [];
        const promises: Promise<void>[] = [];

        let index = 0;
        for (const m of scene.meshes ?? []) {
            if (!m.geometryId || (finalExport && m.metadata?.keepGeometryInline)) { continue; }

            const geometry = scene.geometries?.vertexData?.find((v) => v.id === m.geometryId);
            if (!geometry) { continue; }

            const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;
            const originMesh = editor.scene!.getMeshByID(m.id);

            m.delayLoadingFile = `${overridePath ?? ""}geometries/${geometryFileName}`;
            m.boundingBoxMaximum = originMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
            m.boundingBoxMinimum = originMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
            m._binaryInfo = {};

            const geometryPath = join(path, geometryFileName);
            const stream = createWriteStream(geometryPath);

            let offset = 0;

            if (geometry.positions) {
                m._binaryInfo.positionsAttrDesc = { count: geometry.positions.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.positions).buffer));

                m.positions = null;
                offset += geometry.positions.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.normals) {
                m._binaryInfo.normalsAttrDesc = { count: geometry.normals.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.normals).buffer));

                m.normals = null;
                offset += geometry.normals.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.uvs) {
                m._binaryInfo.uvsAttrDesc = { count: geometry.uvs.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.uvs).buffer));

                m.uvs = null;
                m.hasUVs = true;
                offset += geometry.uvs.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.uv2s) {
                m._binaryInfo.uvs2AttrDesc = { count: geometry.uv2s.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.uv2s).buffer));

                m.uv2s = null;
                m.hasUVs2 = true;
                offset += geometry.uv2s.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.tangents) {
                m._binaryInfo.tangetsAttrDesc = { count: geometry.tangents.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.tangents).buffer));

                m.tangents = null;
                offset += geometry.tangents.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.colors) {
                m._binaryInfo.colorsAttrDesc = { count: geometry.colors.length, stride: 4, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.colors).buffer));

                m.colors = null;
                offset += geometry.colors.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.matricesIndices) {
                const matricesIndices: number[] = [];

                for (let i = 0; i < geometry.matricesIndices.length; i += 4) {
                    const bone: number[] = [
                        geometry.matricesIndices[i],
                        geometry.matricesIndices[i + 1],
                        geometry.matricesIndices[i + 2],
                        geometry.matricesIndices[i + 3],
                    ];

                    matricesIndices.push((bone[3] << 24) | (bone[2] << 16) | (bone[1] << 8) | bone[0]);
                }

                m._binaryInfo.matricesIndicesAttrDesc = { count: matricesIndices.length, stride: 1, offset, dataType: 0 };
                stream.write(Buffer.from(new Int32Array(matricesIndices).buffer));

                m.matricesIndices = null;
                m.hasMatricesIndices = true;
                offset += matricesIndices.length * Int32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.matricesWeights) {
                m._binaryInfo.matricesWeightsAttrDesc = { count: geometry.matricesWeights.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.matricesWeights).buffer));

                m.matricesWeights = null;
                m.hasMatricesWeights = true;
                offset += geometry.matricesWeights.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.indices) {
                m._binaryInfo.indicesAttrDesc = { count: geometry.indices.length, stride: 1, offset, dataType: 0 };
                stream.write(Buffer.from(new Int32Array(geometry.indices).buffer));

                m.indices = null;
                offset += geometry.indices.length * Int32Array.BYTES_PER_ELEMENT;
            }

            if (m.subMeshes?.length > 0) {
                const subMeshesData: number[] = [];
                m.subMeshes.forEach((sm) => {
                    subMeshesData.push(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount);
                });

                m._binaryInfo.subMeshesAttrDesc = { count: m.subMeshes.length, stride: 5, offset, dataType: 0 };
                m.subMeshes = null;

                stream.write(Buffer.from(new Int32Array(subMeshesData).buffer));
                offset += subMeshesData.length * Int32Array.BYTES_PER_ELEMENT;
            }

            promises.push(new Promise<void>((resolve) => {
                stream.once("close", () => resolve());
            }));

            stream.end();
            stream.close();

            if (task) {
                editor.updateTaskFeedback(task, 100 * (index / scene.meshes.length));
            }

            result.push(geometryPath);

            const geometryIndex = scene.geometries.vertexData.findIndex((g) => g.id === m.geometryId);
            if (geometryIndex !== -1) {
                scene.geometries.vertexData.splice(geometryIndex, 1);
            }

            index++;
        };

        if (scene.geometries?.vertexData?.length === 0) {
            delete scene.geometries;
        }

        await Promise.all(promises);

        return result;
    }
}
