import { VertexBuffer, Geometry, AbstractMesh, Mesh, SubMesh, Color4 } from "babylonjs";

/**
 * Overrides the _ImportGeometry function to integrate the support of already
 * expanded matrices indices for bones. This will be removed once the Editor will use the
 * babylonjs module in version 5.
 */
Geometry._ImportGeometry = (parsedGeometry: any, mesh: Mesh): void => {
    const scene = mesh.getScene();

    // Geometry
    const geometryId = parsedGeometry.geometryId;
    if (geometryId) {
        const geometry = scene.getGeometryByID(geometryId);
        if (geometry) {
            geometry.applyToMesh(mesh);
        }
    } else if (parsedGeometry instanceof ArrayBuffer) {
        const binaryInfo = mesh._binaryInfo;

        if (binaryInfo.positionsAttrDesc && binaryInfo.positionsAttrDesc.count > 0) {
            const positionsData = new Float32Array(parsedGeometry, binaryInfo.positionsAttrDesc.offset, binaryInfo.positionsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.PositionKind, positionsData, false);
        }

        if (binaryInfo.normalsAttrDesc && binaryInfo.normalsAttrDesc.count > 0) {
            const normalsData = new Float32Array(parsedGeometry, binaryInfo.normalsAttrDesc.offset, binaryInfo.normalsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.NormalKind, normalsData, false);
        }

        if (binaryInfo.tangetsAttrDesc && binaryInfo.tangetsAttrDesc.count > 0) {
            const tangentsData = new Float32Array(parsedGeometry, binaryInfo.tangetsAttrDesc.offset, binaryInfo.tangetsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.TangentKind, tangentsData, false);
        }

        if (binaryInfo.uvsAttrDesc && binaryInfo.uvsAttrDesc.count > 0) {
            const uvsData = new Float32Array(parsedGeometry, binaryInfo.uvsAttrDesc.offset, binaryInfo.uvsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UVKind, uvsData, false);
        }

        if (binaryInfo.uvs2AttrDesc && binaryInfo.uvs2AttrDesc.count > 0) {
            const uvs2Data = new Float32Array(parsedGeometry, binaryInfo.uvs2AttrDesc.offset, binaryInfo.uvs2AttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UV2Kind, uvs2Data, false);
        }

        if (binaryInfo.uvs3AttrDesc && binaryInfo.uvs3AttrDesc.count > 0) {
            const uvs3Data = new Float32Array(parsedGeometry, binaryInfo.uvs3AttrDesc.offset, binaryInfo.uvs3AttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UV3Kind, uvs3Data, false);
        }

        if (binaryInfo.uvs4AttrDesc && binaryInfo.uvs4AttrDesc.count > 0) {
            const uvs4Data = new Float32Array(parsedGeometry, binaryInfo.uvs4AttrDesc.offset, binaryInfo.uvs4AttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UV4Kind, uvs4Data, false);
        }

        if (binaryInfo.uvs5AttrDesc && binaryInfo.uvs5AttrDesc.count > 0) {
            const uvs5Data = new Float32Array(parsedGeometry, binaryInfo.uvs5AttrDesc.offset, binaryInfo.uvs5AttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UV5Kind, uvs5Data, false);
        }

        if (binaryInfo.uvs6AttrDesc && binaryInfo.uvs6AttrDesc.count > 0) {
            const uvs6Data = new Float32Array(parsedGeometry, binaryInfo.uvs6AttrDesc.offset, binaryInfo.uvs6AttrDesc.count);
            mesh.setVerticesData(VertexBuffer.UV6Kind, uvs6Data, false);
        }

        if (binaryInfo.colorsAttrDesc && binaryInfo.colorsAttrDesc.count > 0) {
            const colorsData = new Float32Array(parsedGeometry, binaryInfo.colorsAttrDesc.offset, binaryInfo.colorsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.ColorKind, colorsData, false, binaryInfo.colorsAttrDesc.stride);
        }

        if (binaryInfo.matricesIndicesAttrDesc && binaryInfo.matricesIndicesAttrDesc.count > 0) {
            const matricesIndicesData = new Int32Array(parsedGeometry, binaryInfo.matricesIndicesAttrDesc.offset, binaryInfo.matricesIndicesAttrDesc.count);
            const floatIndices: number[] = [];

            if (!binaryInfo.matricesIndicesAttrDesc.isExpanded) {
                for (let i = 0; i < matricesIndicesData.length; i++) {
                    const index = matricesIndicesData[i];
                    floatIndices.push(index & 0x000000ff);
                    floatIndices.push((index & 0x0000ff00) >> 8);
                    floatIndices.push((index & 0x00ff0000) >> 16);
                    floatIndices.push((index >> 24) & 0xff); // & 0xFF to convert to v + 256 if v < 0
                }
                mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, floatIndices, false);
            } else {
                for (let i = 0; i < matricesIndicesData.length; i++) {
                    const index = matricesIndicesData[i];
                    floatIndices.push(index);
                }
                mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, floatIndices, false);
            }
        }

        if (binaryInfo.matricesIndicesExtraAttrDesc && binaryInfo.matricesIndicesExtraAttrDesc.count > 0) {
            const matricesIndicesData = new Int32Array(parsedGeometry, binaryInfo.matricesIndicesExtraAttrDesc.offset, binaryInfo.matricesIndicesExtraAttrDesc.count);
            const floatIndices: number[] = [];

            if (!binaryInfo.matricesIndicesExtraAttrDesc.isExpanded) {
                for (let i = 0; i < matricesIndicesData.length; i++) {
                    const index = matricesIndicesData[i];
                    floatIndices.push(index & 0x000000ff);
                    floatIndices.push((index & 0x0000ff00) >> 8);
                    floatIndices.push((index & 0x00ff0000) >> 16);
                    floatIndices.push((index >> 24) & 0xff); // & 0xFF to convert to v + 256 if v < 0
                }
                mesh.setVerticesData(VertexBuffer.MatricesIndicesExtraKind, floatIndices, false);
            } else {
                for (let i = 0; i < matricesIndicesData.length; i++) {
                    const index = matricesIndicesData[i];
                    floatIndices.push(index);
                }
                mesh.setVerticesData(VertexBuffer.MatricesIndicesExtraKind, floatIndices, false);
            }
        }

        if (binaryInfo.matricesWeightsAttrDesc && binaryInfo.matricesWeightsAttrDesc.count > 0) {
            const matricesWeightsData = new Float32Array(parsedGeometry, binaryInfo.matricesWeightsAttrDesc.offset, binaryInfo.matricesWeightsAttrDesc.count);
            mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, matricesWeightsData, false);
        }

        if (binaryInfo.indicesAttrDesc && binaryInfo.indicesAttrDesc.count > 0) {
            const indicesData = new Int32Array(parsedGeometry, binaryInfo.indicesAttrDesc.offset, binaryInfo.indicesAttrDesc.count);
            mesh.setIndices(indicesData, null);
        }

        if (binaryInfo.subMeshesAttrDesc && binaryInfo.subMeshesAttrDesc.count > 0) {
            const subMeshesData = new Int32Array(parsedGeometry, binaryInfo.subMeshesAttrDesc.offset, binaryInfo.subMeshesAttrDesc.count * 5);

            mesh.subMeshes = [];
            for (let i = 0; i < binaryInfo.subMeshesAttrDesc.count; i++) {
                const materialIndex = subMeshesData[i * 5 + 0];
                const verticesStart = subMeshesData[i * 5 + 1];
                const verticesCount = subMeshesData[i * 5 + 2];
                const indexStart = subMeshesData[i * 5 + 3];
                const indexCount = subMeshesData[i * 5 + 4];

                SubMesh.AddToMesh(materialIndex, verticesStart, verticesCount, indexStart, indexCount, <AbstractMesh>mesh);
            }
        }
    } else if (parsedGeometry.positions && parsedGeometry.normals && parsedGeometry.indices) {
        mesh.setVerticesData(VertexBuffer.PositionKind, parsedGeometry.positions, parsedGeometry.positions._updatable);

        mesh.setVerticesData(VertexBuffer.NormalKind, parsedGeometry.normals, parsedGeometry.normals._updatable);

        if (parsedGeometry.tangents) {
            mesh.setVerticesData(VertexBuffer.TangentKind, parsedGeometry.tangents, parsedGeometry.tangents._updatable);
        }

        if (parsedGeometry.uvs) {
            mesh.setVerticesData(VertexBuffer.UVKind, parsedGeometry.uvs, parsedGeometry.uvs._updatable);
        }

        if (parsedGeometry.uvs2) {
            mesh.setVerticesData(VertexBuffer.UV2Kind, parsedGeometry.uvs2, parsedGeometry.uvs2._updatable);
        }

        if (parsedGeometry.uvs3) {
            mesh.setVerticesData(VertexBuffer.UV3Kind, parsedGeometry.uvs3, parsedGeometry.uvs3._updatable);
        }

        if (parsedGeometry.uvs4) {
            mesh.setVerticesData(VertexBuffer.UV4Kind, parsedGeometry.uvs4, parsedGeometry.uvs4._updatable);
        }

        if (parsedGeometry.uvs5) {
            mesh.setVerticesData(VertexBuffer.UV5Kind, parsedGeometry.uvs5, parsedGeometry.uvs5._updatable);
        }

        if (parsedGeometry.uvs6) {
            mesh.setVerticesData(VertexBuffer.UV6Kind, parsedGeometry.uvs6, parsedGeometry.uvs6._updatable);
        }

        if (parsedGeometry.colors) {
            mesh.setVerticesData(VertexBuffer.ColorKind, Color4.CheckColors4(parsedGeometry.colors, parsedGeometry.positions.length / 3), parsedGeometry.colors._updatable);
        }

        if (parsedGeometry.matricesIndices) {
            if (!parsedGeometry.matricesIndices._isExpanded) {
                const floatIndices: number[] = [];

                for (let i = 0; i < parsedGeometry.matricesIndices.length; i++) {
                    const matricesIndex = parsedGeometry.matricesIndices[i];

                    floatIndices.push(matricesIndex & 0x000000ff);
                    floatIndices.push((matricesIndex & 0x0000ff00) >> 8);
                    floatIndices.push((matricesIndex & 0x00ff0000) >> 16);
                    floatIndices.push((matricesIndex >> 24) & 0xff); // & 0xFF to convert to v + 256 if v < 0
                }

                mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, floatIndices, parsedGeometry.matricesIndices._updatable);
            } else {
                delete parsedGeometry.matricesIndices._isExpanded;
                mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, parsedGeometry.matricesIndices, parsedGeometry.matricesIndices._updatable);
            }
        }

        if (parsedGeometry.matricesIndicesExtra) {
            if (!parsedGeometry.matricesIndicesExtra._isExpanded) {
                const floatIndices: number[] = [];

                for (let i = 0; i < parsedGeometry.matricesIndicesExtra.length; i++) {
                    const matricesIndex = parsedGeometry.matricesIndicesExtra[i];

                    floatIndices.push(matricesIndex & 0x000000ff);
                    floatIndices.push((matricesIndex & 0x0000ff00) >> 8);
                    floatIndices.push((matricesIndex & 0x00ff0000) >> 16);
                    floatIndices.push((matricesIndex >> 24) & 0xff); // & 0xFF to convert to v + 256 if v < 0
                }

                mesh.setVerticesData(VertexBuffer.MatricesIndicesExtraKind, floatIndices, parsedGeometry.matricesIndicesExtra._updatable);
            } else {
                delete parsedGeometry.matricesIndices._isExpanded;
                mesh.setVerticesData(VertexBuffer.MatricesIndicesExtraKind, parsedGeometry.matricesIndicesExtra, parsedGeometry.matricesIndicesExtra._updatable);
            }
        }

        if (parsedGeometry.matricesWeights) {
            Geometry["_CleanMatricesWeights"](parsedGeometry, mesh);
            mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, parsedGeometry.matricesWeights, parsedGeometry.matricesWeights._updatable);
        }

        if (parsedGeometry.matricesWeightsExtra) {
            mesh.setVerticesData(VertexBuffer.MatricesWeightsExtraKind, parsedGeometry.matricesWeightsExtra, parsedGeometry.matricesWeights._updatable);
        }

        mesh.setIndices(parsedGeometry.indices, null);
    }

    // SubMeshes
    if (parsedGeometry.subMeshes) {
        mesh.subMeshes = [];
        for (let subIndex = 0; subIndex < parsedGeometry.subMeshes.length; subIndex++) {
            const parsedSubMesh = parsedGeometry.subMeshes[subIndex];

            SubMesh.AddToMesh(parsedSubMesh.materialIndex, parsedSubMesh.verticesStart, parsedSubMesh.verticesCount, parsedSubMesh.indexStart, parsedSubMesh.indexCount, <AbstractMesh>mesh);
        }
    }

    // Flat shading
    if (mesh._shouldGenerateFlatShading) {
        mesh.convertToFlatShadedMesh();
        mesh._shouldGenerateFlatShading = false;
    }

    // Update
    mesh.computeWorldMatrix(true);

    scene.onMeshImportedObservable.notifyObservers(<AbstractMesh>mesh);
};
