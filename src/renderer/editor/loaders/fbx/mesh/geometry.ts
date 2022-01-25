import { INumberDictionary, Undefinable, Nullable } from "../../../../../shared/types";

import { FBXReaderNode } from "fbx-parser";
import { Geometry, VertexData, Scene, FloatArray, Vector3, Vector4, Matrix } from "babylonjs";

import { FBXUtils } from "../utils";
import { IFBXLoaderRuntime } from "../loader";

import { IFBXSkeleton } from "./skeleton";

import { Tools } from "../../../tools/tools";

interface IFBXParsedGeometryData {
    dataSize: number;
    buffer: number[];
    indices: number[];
    mappingType: string;
    referenceType: string;
}

interface IFBXWeightTable {
    id: number;
    weight: number;
}

interface IFBXBuffers {
    uvs: number[];
    normals: number[];
    indices: number[];
    positions: number[];

    materialIndices: number[];

    matricesIndices: number[];
    matricesWeights: number[];
}

interface IFBXInBuffers {
    indices: number[];
    positions: number[];
    uvs?: IFBXParsedGeometryData;
    normals?: IFBXParsedGeometryData;

    materials?: IFBXParsedGeometryData;

    skeleton?: IFBXSkeleton;
    weightTable: INumberDictionary<IFBXWeightTable[]>;
}

interface IFBXFaceInfo {
    outputBuffers: IFBXBuffers;
    sourceBuffers: IFBXInBuffers;

    faceLength: number;
    facePositionIndexes: number[];

    faceUVs: number[];
    faceNormals: number[];

    materialIndex?: number;

    faceWeights: number[];
    faceWeightIndices: number[];
}

export interface IFBXGeometryResult {
    geometry: Geometry;
    materialIndices?: number[];
}

export class FBXGeometry {
    /**
     * Parses all available geometries.
     * @param runtime defines the reference to the current FBX runtime.
     */
    public static ParseGeometries(runtime: IFBXLoaderRuntime): void {
        for (const g of runtime.geometries) {
            const geometryId = g.prop(0, "number")!;
            const relationShips = runtime.connections.get(geometryId);

            const model = relationShips?.parents.map((p) => {
                return runtime.objects.nodes("Model").find((m) => m.prop(0, "number") === p.id);
            })[0];

            const skeleton = relationShips?.children.reduce<IFBXSkeleton | undefined>((skeleton, child) => {
                if (runtime.cachedSkeletons[child.id] !== undefined) {
                    skeleton = runtime.cachedSkeletons[child.id];
                }

                return skeleton;
            }, undefined);

            let importedGeometry = runtime.cachedGeometries[geometryId];
            if (!importedGeometry) {
                importedGeometry = this.Import(g, runtime.scene, skeleton, model);

                runtime.result.geometries.push(importedGeometry.geometry);
                runtime.cachedGeometries[geometryId] = importedGeometry;
            }
        }
    }

    /**
     * Imports the given Geometry node and returns its reference.
     * @param node defines the reference to the Geometry FBX node.
     * @param scene defines the reference to the scene where to add the geometry.
     * @param skeleton defines the optional reference to the skeleton linked to the geometry.
     * @returns the reference to the parsed geometry.
     */
    public static Import(node: FBXReaderNode, scene: Scene, skeleton?: IFBXSkeleton, model?: FBXReaderNode): IFBXGeometryResult {
        const positions = node.node("Vertices")?.prop(0, "number[]");
        if (!positions) {
            throw new Error("Failed to parse positions of geometry");
        }

        const indices = node.node("PolygonVertexIndex")?.prop(0, "number[]");
        if (!indices) {
            throw new Error("Failed to parse indices of geometry");
        }

        const uvs = this._ParseUvs(node.node("LayerElementUV"));
        const normals = this._ParseNormals(node.node("LayerElementNormal"));
        const materials = this._ParseMaterials(node.node("LayerElementMaterial"));

        const weightTable: INumberDictionary<IFBXWeightTable[]> = {};
        if (skeleton) {
            skeleton.rawBones.forEach((bone, boneIndex) => {
                bone.indices.forEach((indice, indiceIndex) => {
                    if (!weightTable[indice]) {
                        weightTable[indice] = [];
                    }

                    weightTable[indice].push({
                        id: boneIndex,
                        weight: bone.weights[indiceIndex],
                    });
                });
            });
        }

        const buffers = this._GenerateBuffers({ positions, indices, normals, uvs, materials, skeleton, weightTable });

        const vertexData = new VertexData();
        vertexData.indices = buffers.indices;
        vertexData.positions = buffers.positions;

        if (buffers.uvs.length) {
            vertexData.uvs = buffers.uvs;
        }

        if (buffers.normals.length) {
            vertexData.normals = buffers.normals;
        }

        if (buffers.matricesIndices.length) {
            vertexData.matricesIndices = buffers.matricesIndices;
        }
        if (buffers.matricesWeights.length) {
            vertexData.matricesWeights = buffers.matricesWeights;
        }

        if (skeleton && vertexData.matricesIndices && vertexData.matricesWeights) {
            this._CleanWeights(skeleton, vertexData.matricesIndices as number[], vertexData.matricesWeights as number[]);

            this._NormalizeWeights(vertexData.matricesWeights);
            this._NormalizeWeights(vertexData.matricesWeightsExtra);
        }

        if (model) {
            const properties = model.node("Properties70")?.nodes("P") ?? [];

            let scale = Vector3.One();
            let rotation = Vector3.Zero();
            let translation = Vector3.Zero();
            let eulerOrder = "ZYX";

            const rotationOrder = properties.find((p) => p.prop(0, "string") === "RotationOrder");
            if (rotationOrder) {
                eulerOrder = rotationOrder.prop(4, "string") ?? eulerOrder;
            }

            const geometricTranslation = properties.find((p) => p.prop(0, "string") === "GeometricTranslation");
            if (geometricTranslation) {
                translation.set(geometricTranslation.prop(4, "number") ?? 0, geometricTranslation.prop(5, "number") ?? 0, geometricTranslation.prop(6, "number") ?? 0);
            }

            const geometricRotation = properties.find((p) => p.prop(0, "string") === "GeometricRotation");
            if (geometricRotation) {
                rotation.set(geometricRotation.prop(4, "number") ?? 0, geometricRotation.prop(5, "number") ?? 0, geometricRotation.prop(6, "number") ?? 0);
            }

            const geometricScaling = properties.find((p) => p.prop(0, "string") === "GeometricScaling");
            if (geometricScaling) {
                scale.set(geometricScaling.prop(4, "number") ?? 1, geometricScaling.prop(5, "number") ?? 1, geometricScaling.prop(6, "number") ?? 1);
            }

            const matrix = Matrix.Compose(scale, FBXUtils.GetFinalRotationQuaternionFromVector(rotation), translation);
            if (!matrix.isIdentity()) {
                vertexData.transform(matrix);
            }
        }

        return {
            materialIndices: buffers.materialIndices,
            geometry: new Geometry(Tools.RandomId(), scene, vertexData, false),
        };
    }

    /**
     * Normalizes the given skin weights buffer.
     */
    private static _NormalizeWeights(skinWeights: Nullable<FloatArray>): void {
        if (!skinWeights) {
            return;
        }

        const vector = Vector4.Zero();

        for (let i = 0, l = skinWeights.length; i < l; i++) {
            vector.x = skinWeights[i];
            vector.y = skinWeights[i + 1];
            vector.z = skinWeights[i + 2];
            vector.w = skinWeights[i + 3];

            const scale = 1.0 / vector.length();

            if (scale !== Infinity) {
                vector.multiplyByFloats(scale, scale, scale, scale);
            } else {
                vector.set(1, 0, 0, 0);
            }

            skinWeights[i] = vector.x;
            skinWeights[i + 1] = vector.y;
            skinWeights[i + 2] = vector.z;
            skinWeights[i + 3] = vector.w;
        }
    }

    /**
     * Cleans the given weights and indices.
     */
    private static _CleanWeights(skeleton: IFBXSkeleton, matricesIndices: number[], matricesWeights: number[]): void {
        const epsilon: number = 1e-3;
        const noInfluenceBoneIndex = skeleton.rawBones.length;

        let influencers = 4;
        let size = matricesWeights.length;

        for (var i = 0; i < size; i += 4) {
            let weight = 0.0;
            let firstZeroWeight = -1;
            for (var j = 0; j < 4; j++) {
                let w = matricesWeights[i + j];
                weight += w;
                if (w < epsilon && firstZeroWeight < 0) {
                    firstZeroWeight = j;
                }
            }
            if (firstZeroWeight < 0 || firstZeroWeight > influencers - 1) {
                firstZeroWeight = influencers - 1;
            }
            if (weight > epsilon) {
                let mweight = 1.0 / weight;
                for (var j = 0; j < 4; j++) {
                    matricesWeights[i + j] *= mweight;
                }
            } else {
                if (firstZeroWeight < 4) {
                    matricesWeights[i + firstZeroWeight] = 1.0 - weight;
                    matricesIndices[i + firstZeroWeight] = noInfluenceBoneIndex;
                }
            }
        }
    }

    /**
     * Generates the final buffers.
     */
    private static _GenerateBuffers(sourceBuffers: IFBXInBuffers): IFBXBuffers {
        const outputBuffersDict: Record<number, IFBXBuffers> = { };

        let faceLength = 0;
        let polygonIndex = 0;

        // these will hold data for a single face
        let faceUVs: number[] = [];
        let faceWeights: number[] = [];
        let faceNormals: number[] = [];
        let faceWeightIndices: number[] = [];
        let facePositionIndexes: number[] = [];

        let materialIndex = 0;

        sourceBuffers.indices.forEach((vertexIndex, polygonVertexIndex) => {
            let endOfFace = false;

            // Face index and vertex index arrays are combined in a single array
            // A cube with quad faces looks like this:
            // PolygonVertexIndex: *24 {
            //  a: 0, 1, 3, -3, 2, 3, 5, -5, 4, 5, 7, -7, 6, 7, 1, -1, 1, 7, 5, -4, 6, 0, 2, -5
            //  }
            // Negative numbers mark the end of a face - first face here is 0, 1, 3, -3
            // to find index of last vertex bit shift the index: ^ - 1
            if (vertexIndex < 0) {
                vertexIndex = vertexIndex ^ -1; // equivalent to ( x * -1 ) - 1
                endOfFace = true;
            }

            let weights: number[] = [];
            let weightIndices: number[] = [];

            facePositionIndexes.push(vertexIndex * 3, vertexIndex * 3 + 1, vertexIndex * 3 + 2);

            if (sourceBuffers.normals) {
                const data = this._GetData(polygonVertexIndex, polygonIndex, vertexIndex, sourceBuffers.normals);
                faceNormals.push(data[0], data[1], data[2]);
            }

            if (sourceBuffers.uvs) {
                const data = this._GetData(polygonVertexIndex, polygonIndex, vertexIndex, sourceBuffers.uvs);
                faceUVs.push(data[0], data[1]);
            }

            if (sourceBuffers.materials) {
                materialIndex = Math.max(0, this._GetData(polygonVertexIndex, polygonIndex, vertexIndex, sourceBuffers.materials)[0] ?? 0);
            }

            if (sourceBuffers.skeleton) {
                if (sourceBuffers.weightTable[vertexIndex] !== undefined) {
                    sourceBuffers.weightTable[vertexIndex].forEach((wt) => {
                        weights.push(wt.weight);
                        weightIndices.push(wt.id);
                    });
                }

                if (weights.length > 4) {
                    const weightIndices2 = [0, 0, 0, 0];
                    const weights2 = [0, 0, 0, 0];

                    weights.forEach(function (weight, weightIndex) {
                        let currentWeight = weight;
                        let currentIndex = weightIndices[weightIndex];

                        weights2.forEach((comparedWeight, comparedWeightIndex, comparedWeightArray) => {
                            if (currentWeight > comparedWeight) {
                                comparedWeightArray[comparedWeightIndex] = currentWeight;
                                currentWeight = comparedWeight;

                                const tmp = weightIndices2[comparedWeightIndex];
                                weightIndices2[comparedWeightIndex] = currentIndex;
                                currentIndex = tmp;
                            }
                        });
                    });

                    weights = weights2;
                    weightIndices = weightIndices2;
                }

                // if the weight array is shorter than 4 pad with 0s
                while (weights.length < 4) {
                    weights.push(0);
                    weightIndices.push(0);
                }

                for (let i = 0; i < 4; ++i) {
                    faceWeights.push(weights[i]);
                    faceWeightIndices.push(weightIndices[i]);
                }
            }

            faceLength++;

            if (endOfFace) {
                if (!outputBuffersDict[materialIndex]) {
                    outputBuffersDict[materialIndex] = {
                        uvs: [],
                        indices: [],
                        normals: [],
                        positions: [],
                        materialIndices: [],
                        matricesIndices: [],
                        matricesWeights: [],
                    };
                }

                this._GenerateFace({ sourceBuffers, outputBuffers: outputBuffersDict[materialIndex], facePositionIndexes, faceLength, faceUVs, faceNormals, faceWeights, faceWeightIndices, materialIndex });

                polygonIndex++;
                faceLength = 0;

                // reset arrays for the next face
                faceUVs = [];
                faceNormals = [];
                faceWeights = [];
                faceWeightIndices = [];
                facePositionIndexes = [];
            }
        });

        // Re-order buffers to avoid having too much draw-calls
        const outputBuffers: IFBXBuffers = {
            uvs: [],
            indices: [],
            normals: [],
            positions: [],
            materialIndices: [],
            matricesIndices: [],
            matricesWeights: [],
        };

        for (const mi in outputBuffersDict) {
            const ob = outputBuffersDict[mi];

            const startIndex = outputBuffers.indices.length;
            const endIndex = startIndex + ob.indices.length;

            for (let i = startIndex; i < endIndex; i++) {
                outputBuffers.indices.push(i);
            }

            outputBuffers.uvs = outputBuffers.uvs.concat(ob.uvs);
            outputBuffers.normals = outputBuffers.normals.concat(ob.normals);
            outputBuffers.positions = outputBuffers.positions.concat(ob.positions);
            outputBuffers.materialIndices = outputBuffers.materialIndices.concat(ob.materialIndices);
            outputBuffers.matricesIndices = outputBuffers.matricesIndices.concat(ob.matricesIndices);
            outputBuffers.matricesWeights = outputBuffers.matricesWeights.concat(ob.matricesWeights);
        }

        return outputBuffers;
    }

    /**
     * Generates a face according the to given face infos.
     */
    private static _GenerateFace(face: IFBXFaceInfo): void {
        for (var i = 2; i < face.faceLength; i++) {
            // Positions
            face.outputBuffers.positions.push(-face.sourceBuffers.positions[face.facePositionIndexes[0]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[1]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[2]]);

            face.outputBuffers.positions.push(-face.sourceBuffers.positions[face.facePositionIndexes[(i - 1) * 3]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[(i - 1) * 3 + 1]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[(i - 1) * 3 + 2]]);

            face.outputBuffers.positions.push(-face.sourceBuffers.positions[face.facePositionIndexes[i * 3]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[i * 3 + 1]]);
            face.outputBuffers.positions.push(face.sourceBuffers.positions[face.facePositionIndexes[i * 3 + 2]]);

            // Index
            const index = face.outputBuffers.indices.length;
            face.outputBuffers.indices.push(index);
            face.outputBuffers.indices.push(index + 1);
            face.outputBuffers.indices.push(index + 2);

            // Normals
            if (face.sourceBuffers.normals) {
                face.outputBuffers.normals.push(-face.faceNormals[0]);
                face.outputBuffers.normals.push(face.faceNormals[1]);
                face.outputBuffers.normals.push(face.faceNormals[2]);

                face.outputBuffers.normals.push(-face.faceNormals[(i - 1) * 3]);
                face.outputBuffers.normals.push(face.faceNormals[(i - 1) * 3 + 1]);
                face.outputBuffers.normals.push(face.faceNormals[(i - 1) * 3 + 2]);

                face.outputBuffers.normals.push(-face.faceNormals[i * 3]);
                face.outputBuffers.normals.push(face.faceNormals[i * 3 + 1]);
                face.outputBuffers.normals.push(face.faceNormals[i * 3 + 2]);
            }

            // UVs
            if (face.sourceBuffers.uvs) {
                face.outputBuffers.uvs.push(face.faceUVs[0]);
                face.outputBuffers.uvs.push(face.faceUVs[1]);

                face.outputBuffers.uvs.push(face.faceUVs[(i - 1) * 2]);
                face.outputBuffers.uvs.push(face.faceUVs[(i - 1) * 2 + 1]);

                face.outputBuffers.uvs.push(face.faceUVs[i * 2]);
                face.outputBuffers.uvs.push(face.faceUVs[i * 2 + 1]);
            }

            if (face.materialIndex !== undefined) {
                face.outputBuffers.materialIndices.push(face.materialIndex);
                face.outputBuffers.materialIndices.push(face.materialIndex);
                face.outputBuffers.materialIndices.push(face.materialIndex);
            }

            // Skeleton
            if (face.sourceBuffers.skeleton) {
                face.outputBuffers.matricesWeights.push(face.faceWeights[0]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[1]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[2]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[3]);

                face.outputBuffers.matricesWeights.push(face.faceWeights[(i - 1) * 4]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[(i - 1) * 4 + 1]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[(i - 1) * 4 + 2]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[(i - 1) * 4 + 3]);

                face.outputBuffers.matricesWeights.push(face.faceWeights[i * 4]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[i * 4 + 1]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[i * 4 + 2]);
                face.outputBuffers.matricesWeights.push(face.faceWeights[i * 4 + 3]);

                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[0]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[1]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[2]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[3]);

                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[(i - 1) * 4]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[(i - 1) * 4 + 1]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[(i - 1) * 4 + 2]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[(i - 1) * 4 + 3]);

                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[i * 4]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[i * 4 + 1]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[i * 4 + 2]);
                face.outputBuffers.matricesIndices.push(face.faceWeightIndices[i * 4 + 3]);
            }
        }
    }

    /**
     * Parses the given UVs FBX node and returns its parsed geometry data.
     */
    private static _ParseUvs(node?: FBXReaderNode): Undefinable<IFBXParsedGeometryData> {
        if (!node) {
            return undefined;
        }

        const mappingType = node.node("MappingInformationType")?.prop(0, "string")!;
        const referenceType = node.node("ReferenceInformationType")?.prop(0, "string")!;
        const buffer = node.node("UV")?.prop(0, "number[]")!;

        let indices: number[] = [];
        if (referenceType === "IndexToDirect") {
            indices = node.node("UVIndex")!.prop(0, "number[]")!;
        }

        return {
            buffer,
            indices,
            dataSize: 2,
            mappingType: mappingType,
            referenceType: referenceType,
        };
    }

    /**
     * Parses the given normals FBX node and returns its parsed geometry data.
     */
    private static _ParseNormals(node?: FBXReaderNode): Undefinable<IFBXParsedGeometryData> {
        if (!node) {
            return undefined;
        }

        const mappingType = node.node("MappingInformationType")!.prop(0, "string")!;
        const referenceType = node.node("ReferenceInformationType")!.prop(0, "string")!;
        const buffer = node.node("Normals")!.prop(0, "number[]")!;

        let indices: number[] = [];
        if (referenceType === "IndexToDirect") {
            indices = (node.node("NormalIndex") ?? node.node("NormalsIndex"))!.prop(0, "number[]")!;
        }

        return {
            buffer,
            indices,
            dataSize: 3,
            mappingType: mappingType,
            referenceType: referenceType,
        };
    }

    /**
     * Parses the given materials FBX node and returns its parsed geometry data.
     */
    private static _ParseMaterials(node?: FBXReaderNode): Undefinable<IFBXParsedGeometryData> {
        if (!node) {
            return undefined;
        }

        const mappingType = node.node("MappingInformationType")!.prop(0, "string")!;
        if (mappingType === "AllSame") {
            return undefined;
        }

        const referenceType = node.node("ReferenceInformationType")!.prop(0, "string")!;

        if (mappingType === 'NoMappingInformation') {
            return {
                dataSize: 1,
                buffer: [0],
                indices: [0],
                mappingType: "AllSame",
                referenceType: referenceType
            };
        }

        const buffer = node.node("Materials")!.prop(0, "number[]")!;

        // Since materials are stored as indices, there's a bit of a mismatch between FBX and what
        // we expect.So we create an intermediate buffer that points to the index in the buffer,
        // for conforming with the other functions we've written for other data.
        const materialIndices: number[] = [];

        for (let i = 0; i < buffer.length; ++i) {
            materialIndices.push(i);
        }

        return {
            buffer,
            dataSize: 1,
            indices: materialIndices,
            mappingType: mappingType,
            referenceType: referenceType
        };
    }

    /**
     * Returns the data associated to the given parsed geometry data.
     */
    private static _GetData(polygonVertexIndex: number, polygonIndex: number, vertexIndex: number, infoObject: IFBXParsedGeometryData): number[] {
        let index = polygonVertexIndex;

        switch (infoObject.mappingType) {
            case "ByPolygonVertex": index = polygonVertexIndex; break;
            case "ByPolygon": index = polygonIndex; break;
            case "ByVertice": index = vertexIndex; break;
            case "AllSame": index = infoObject.indices[0]; break;
            default: break;
        }

        if (infoObject.referenceType === "IndexToDirect") {
            index = infoObject.indices[index];
        }

        var from = index * infoObject.dataSize;
        var to = from + infoObject.dataSize;

        return this._Slice(infoObject.buffer, from, to);
    }

    /**
     * Slices the given array.
     */
    private static _Slice(b: number[], from: number, to: number): number[] {
        const a: number[] = [];
        for (var i = from, j = 0; i < to; i++, j++) {
            a[j] = b[i];
        }

        return a;
    }
}
