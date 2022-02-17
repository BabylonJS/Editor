import "../../../module";

import { createWriteStream } from "fs";

export default class GeometryWorker {
    /**
     * Writes the incremental file
     * @param mesh defines the reference to the serialized mesh object.
     * @param geometry defines the reference to the serialized geometry object.
     * @param geometryPath defines the absolute path where to save the geometry stream.
     */
    public async writeIncremental(mesh: any, geometry: any, geometryPath: string): Promise<any> {
        const stream = createWriteStream(geometryPath);

        let offset = 0;

        if (geometry.positions) {
            mesh._binaryInfo.positionsAttrDesc = { count: geometry.positions.length, stride: 3, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.positions).buffer));

            mesh.positions = null;
            offset += geometry.positions.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.normals) {
            mesh._binaryInfo.normalsAttrDesc = { count: geometry.normals.length, stride: 3, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.normals).buffer));

            mesh.normals = null;
            offset += geometry.normals.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.uvs) {
            mesh._binaryInfo.uvsAttrDesc = { count: geometry.uvs.length, stride: 2, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.uvs).buffer));

            mesh.uvs = null;
            mesh.hasUVs = true;
            offset += geometry.uvs.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.uv2s) {
            mesh._binaryInfo.uvs2AttrDesc = { count: geometry.uv2s.length, stride: 2, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.uv2s).buffer));

            mesh.uv2s = null;
            mesh.hasUVs2 = true;
            offset += geometry.uv2s.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.tangents) {
            mesh._binaryInfo.tangetsAttrDesc = { count: geometry.tangents.length, stride: 3, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.tangents).buffer));

            mesh.tangents = null;
            offset += geometry.tangents.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.colors) {
            mesh._binaryInfo.colorsAttrDesc = { count: geometry.colors.length, stride: 4, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.colors).buffer));

            mesh.colors = null;
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

            mesh._binaryInfo.matricesIndicesAttrDesc = { count: matricesIndices.length, stride: 1, offset, dataType: 0 };
            stream.write(Buffer.from(new Int32Array(matricesIndices).buffer));

            mesh.matricesIndices = null;
            mesh.hasMatricesIndices = true;
            offset += matricesIndices.length * Int32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.matricesWeights) {
            mesh._binaryInfo.matricesWeightsAttrDesc = { count: geometry.matricesWeights.length, stride: 2, offset, dataType: 1 };
            stream.write(Buffer.from(new Float32Array(geometry.matricesWeights).buffer));

            mesh.matricesWeights = null;
            mesh.hasMatricesWeights = true;
            offset += geometry.matricesWeights.length * Float32Array.BYTES_PER_ELEMENT;
        }

        if (geometry.indices) {
            mesh._binaryInfo.indicesAttrDesc = { count: geometry.indices.length, stride: 1, offset, dataType: 0 };
            stream.write(Buffer.from(new Int32Array(geometry.indices).buffer));

            mesh.indices = null;
            offset += geometry.indices.length * Int32Array.BYTES_PER_ELEMENT;
        }

        if (mesh.subMeshes?.length > 0) {
            const subMeshesData: number[] = [];
            mesh.subMeshes.forEach((sm) => {
                subMeshesData.push(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount);
            });

            mesh._binaryInfo.subMeshesAttrDesc = { count: mesh.subMeshes.length, stride: 5, offset, dataType: 0 };
            mesh.subMeshes = null;

            stream.write(Buffer.from(new Int32Array(subMeshesData).buffer));
            offset += subMeshesData.length * Int32Array.BYTES_PER_ELEMENT;
        }

        await new Promise<void>((resolve) => {
            stream.once("close", () => resolve());
            stream.end();
            stream.close();
        });

        return mesh;
    }
}
