import { SceneContext } from "@babylonjs/lite";

import { loadFile } from "../tools/request";

/**
 * Defines the geometry data of a mesh loaded from an editor scene, either from the inline arrays of the serialized
 * mesh or from its binary geometry file (`.babylonbinarymeshdata`).
 */
export interface IMeshGeometryData {
	positions: Float32Array;
	normals: Float32Array | null;
	indices: Uint32Array;
	uvs: Float32Array | null;
	uvs2: Float32Array | null;
	tangents: Float32Array | null;
	colors: Float32Array | null;
	/**
	 * Defines the list of sub-meshes as saved by Babylon.js: materialIndex, verticesStart, verticesCount, indexStart, indexCount.
	 */
	subMeshes: ISubMeshData[];
}

export interface ISubMeshData {
	materialIndex: number;
	verticesStart: number;
	verticesCount: number;
	indexStart: number;
	indexCount: number;
}

const binaryFilesCache = new WeakMap<SceneContext, Map<string, Promise<ArrayBuffer>>>();

/**
 * Loads the binary file located at the given url, sharing the request with all the meshes using the same file
 * (the editor can merge the geometries of a scene in a single file).
 */
function loadBinaryFile(scene: SceneContext, url: string): Promise<ArrayBuffer> {
	let cache = binaryFilesCache.get(scene);
	if (!cache) {
		cache = new Map();
		binaryFilesCache.set(scene, cache);
	}

	let promise = cache.get(url);
	if (!promise) {
		promise = loadFile(url, "arraybuffer");
		cache.set(url, promise);
	}

	return promise;
}

/**
 * @internal
 * Releases the binary geometry files kept in cache while loading the given scene.
 */
export function _clearBinaryFilesCache(scene: SceneContext): void {
	binaryFilesCache.delete(scene);
}

function toFloat32Array(array: ArrayLike<number> | null | undefined): Float32Array | null {
	if (!array || !array.length) {
		return null;
	}

	return array instanceof Float32Array ? array : new Float32Array(array);
}

/**
 * Parses the geometry stored in the given binary buffer according to the binary information of the mesh, as
 * written by the editor (see `writeBinaryGeometry` in the editor).
 */
function parseBinaryGeometry(buffer: ArrayBuffer, binaryInfo: any) {
	const result: Partial<IMeshGeometryData> & { subMeshesData?: Int32Array } = {};

	const floats = (desc: any) => (desc ? new Float32Array(buffer, desc.offset, desc.count) : null);

	result.positions = floats(binaryInfo.positionsAttrDesc) ?? new Float32Array(0);
	result.normals = floats(binaryInfo.normalsAttrDesc);
	result.uvs = floats(binaryInfo.uvsAttrDesc);
	result.uvs2 = floats(binaryInfo.uvs2AttrDesc);
	result.tangents = floats(binaryInfo.tangetsAttrDesc);
	result.colors = floats(binaryInfo.colorsAttrDesc);

	if (binaryInfo.indicesAttrDesc) {
		result.indices = new Uint32Array(buffer, binaryInfo.indicesAttrDesc.offset, binaryInfo.indicesAttrDesc.count);
	}

	if (binaryInfo.subMeshesAttrDesc) {
		result.subMeshesData = new Int32Array(buffer, binaryInfo.subMeshesAttrDesc.offset, binaryInfo.subMeshesAttrDesc.count * 5);
	}

	return result;
}

/**
 * Computes smooth normals for the given positions and indices, using the same scheme as Babylon.js `VertexData.ComputeNormals`.
 */
export function computeSmoothNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
	const normals = new Float32Array(positions.length);

	for (let i = 0; i < indices.length; i += 3) {
		const i0 = indices[i] * 3;
		const i1 = indices[i + 1] * 3;
		const i2 = indices[i + 2] * 3;

		const p1x = positions[i0] - positions[i1];
		const p1y = positions[i0 + 1] - positions[i1 + 1];
		const p1z = positions[i0 + 2] - positions[i1 + 2];

		const p2x = positions[i2] - positions[i1];
		const p2y = positions[i2 + 1] - positions[i1 + 1];
		const p2z = positions[i2 + 2] - positions[i1 + 2];

		// Left-handed: same cross product order as Babylon.js.
		let nx = p1y * p2z - p1z * p2y;
		let ny = p1z * p2x - p1x * p2z;
		let nz = p1x * p2y - p1y * p2x;

		const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
		nx /= length;
		ny /= length;
		nz /= length;

		for (const index of [i0, i1, i2]) {
			normals[index] += nx;
			normals[index + 1] += ny;
			normals[index + 2] += nz;
		}
	}

	for (let i = 0; i < normals.length; i += 3) {
		const length = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]) || 1;
		normals[i] /= length;
		normals[i + 1] /= length;
		normals[i + 2] /= length;
	}

	return normals;
}

/**
 * Applies the given matrix (Babylon.js pre-transform matrix, `localMatrix` in the serialized meshes) to the given
 * positions and normals. Babylon Lite has no pre-transform matrix for meshes: it is baked into the vertices.
 */
function bakeLocalMatrix(positions: Float32Array, normals: Float32Array | null, m: number[]): void {
	for (let i = 0; i < positions.length; i += 3) {
		const x = positions[i];
		const y = positions[i + 1];
		const z = positions[i + 2];

		positions[i] = x * m[0] + y * m[4] + z * m[8] + m[12];
		positions[i + 1] = x * m[1] + y * m[5] + z * m[9] + m[13];
		positions[i + 2] = x * m[2] + y * m[6] + z * m[10] + m[14];
	}

	if (!normals) {
		return;
	}

	for (let i = 0; i < normals.length; i += 3) {
		const x = normals[i];
		const y = normals[i + 1];
		const z = normals[i + 2];

		const nx = x * m[0] + y * m[4] + z * m[8];
		const ny = x * m[1] + y * m[5] + z * m[9];
		const nz = x * m[2] + y * m[6] + z * m[10];

		const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

		normals[i] = nx / length;
		normals[i + 1] = ny / length;
		normals[i + 2] = nz / length;
	}
}

function isIdentityMatrix(m: number[] | undefined): boolean {
	if (!m || m.length !== 16) {
		return true;
	}

	for (let i = 0; i < 16; ++i) {
		const expected = i % 5 === 0 ? 1 : 0;
		if (Math.abs(m[i] - expected) > 1e-7) {
			return false;
		}
	}

	return true;
}

/**
 * Loads the geometry of the given serialized mesh: from its binary geometry file when the geometry was exported
 * as incremental (`delayLoadingFile`), from the vertex data of the scene (`geometryId`) or from its inline arrays.
 * @param scene defines the reference to the scene being loaded.
 * @param rootUrl defines the root url of the scene.
 * @param parsedMesh defines the serialized mesh.
 * @param parsedData defines the serialized scene, used to retrieve the shared vertex data.
 * @returns the geometry data or null if the mesh has no geometry.
 */
export async function loadMeshGeometry(scene: SceneContext, rootUrl: string, parsedMesh: any, parsedData: any): Promise<IMeshGeometryData | null> {
	let positions: Float32Array | null = null;
	let normals: Float32Array | null = null;
	let uvs: Float32Array | null = null;
	let uvs2: Float32Array | null = null;
	let tangents: Float32Array | null = null;
	let colors: Float32Array | null = null;
	let indices: Uint32Array | null = null;
	let subMeshesData: Int32Array | number[] | null = null;

	if (parsedMesh.delayLoadingFile && parsedMesh._binaryInfo) {
		const buffer = await loadBinaryFile(scene, `${rootUrl}${parsedMesh.delayLoadingFile}`);
		const result = parseBinaryGeometry(buffer, parsedMesh._binaryInfo);

		// Copy the attributes: the buffer is shared by all the meshes using the same geometry file and may be baked.
		positions = result.positions ? new Float32Array(result.positions) : null;
		normals = result.normals ? new Float32Array(result.normals) : null;
		uvs = result.uvs ?? null;
		uvs2 = result.uvs2 ?? null;
		tangents = result.tangents ?? null;
		colors = result.colors ?? null;
		indices = result.indices ? new Uint32Array(result.indices) : null;
		subMeshesData = result.subMeshesData ?? null;
	} else {
		let source = parsedMesh;

		if (!parsedMesh.positions && parsedMesh.geometryId) {
			source = parsedData?.geometries?.vertexData?.find((v: any) => v.id === parsedMesh.geometryId) ?? parsedMesh;
		}

		positions = toFloat32Array(source.positions);
		normals = toFloat32Array(source.normals);
		uvs = toFloat32Array(source.uvs);
		uvs2 = toFloat32Array(source.uvs2);
		tangents = toFloat32Array(source.tangents);
		colors = toFloat32Array(source.colors);
		indices = source.indices?.length ? new Uint32Array(source.indices) : null;
	}

	if (!positions?.length) {
		return null;
	}

	const vertexCount = positions.length / 3;

	if (!indices?.length) {
		indices = new Uint32Array(vertexCount);
		for (let i = 0; i < vertexCount; ++i) {
			indices[i] = i;
		}
	}

	if (!normals?.length) {
		normals = computeSmoothNormals(positions, indices);
	}

	if (!isIdentityMatrix(parsedMesh.localMatrix)) {
		bakeLocalMatrix(positions, normals, parsedMesh.localMatrix);
	}

	// Babylon.js stores 3-components tangents in the binary files of the editor but Babylon Lite expects 4 components (w = handedness).
	if (tangents && tangents.length === vertexCount * 3) {
		const tangents4 = new Float32Array(vertexCount * 4);
		for (let i = 0; i < vertexCount; ++i) {
			tangents4[i * 4] = tangents[i * 3];
			tangents4[i * 4 + 1] = tangents[i * 3 + 1];
			tangents4[i * 4 + 2] = tangents[i * 3 + 2];
			tangents4[i * 4 + 3] = 1;
		}
		tangents = tangents4;
	}

	if (tangents && tangents.length !== vertexCount * 4) {
		tangents = null;
	}

	if (colors && colors.length === vertexCount * 3) {
		const colors4 = new Float32Array(vertexCount * 4);
		for (let i = 0; i < vertexCount; ++i) {
			colors4[i * 4] = colors[i * 3];
			colors4[i * 4 + 1] = colors[i * 3 + 1];
			colors4[i * 4 + 2] = colors[i * 3 + 2];
			colors4[i * 4 + 3] = 1;
		}
		colors = colors4;
	}

	const subMeshes: ISubMeshData[] = [];

	if (subMeshesData) {
		for (let i = 0; i + 4 < subMeshesData.length; i += 5) {
			subMeshes.push({
				materialIndex: subMeshesData[i],
				verticesStart: subMeshesData[i + 1],
				verticesCount: subMeshesData[i + 2],
				indexStart: subMeshesData[i + 3],
				indexCount: subMeshesData[i + 4],
			});
		}
	} else if (parsedMesh.subMeshes?.length) {
		parsedMesh.subMeshes.forEach((subMesh: any) => {
			subMeshes.push({
				materialIndex: subMesh.materialIndex,
				verticesStart: subMesh.verticesStart,
				verticesCount: subMesh.verticesCount,
				indexStart: subMesh.indexStart,
				indexCount: subMesh.indexCount,
			});
		});
	}

	if (!subMeshes.length) {
		subMeshes.push({
			materialIndex: 0,
			verticesStart: 0,
			verticesCount: vertexCount,
			indexStart: 0,
			indexCount: indices.length,
		});
	}

	return {
		positions,
		normals,
		indices,
		uvs,
		uvs2,
		tangents,
		colors,
		subMeshes,
	};
}

/**
 * Extracts the geometry of the given sub-mesh: only the vertices of the sub-mesh are kept and its indices are made
 * relative to its first vertex. Babylon Lite draws a mesh with a single material: each sub-mesh of a mesh using a
 * multi-material is loaded as its own mesh.
 * @param geometry defines the geometry of the mesh.
 * @param subMesh defines the sub-mesh to extract.
 */
export function extractSubMeshGeometry(geometry: IMeshGeometryData, subMesh: ISubMeshData): IMeshGeometryData {
	const vertexCount = geometry.positions.length / 3;
	const indices = geometry.indices.subarray(subMesh.indexStart, subMesh.indexStart + subMesh.indexCount);

	let minIndex = Number.MAX_SAFE_INTEGER;
	let maxIndex = -1;
	for (let i = 0; i < indices.length; ++i) {
		minIndex = Math.min(minIndex, indices[i]);
		maxIndex = Math.max(maxIndex, indices[i]);
	}

	if (maxIndex === -1) {
		minIndex = 0;
		maxIndex = 0;
	}

	const start = Math.max(0, Math.min(minIndex, subMesh.verticesStart));
	const end = Math.min(vertexCount, Math.max(maxIndex + 1, subMesh.verticesStart + subMesh.verticesCount));

	const slice = (array: Float32Array | null, stride: number) => (array ? array.slice(start * stride, end * stride) : null);

	const relativeIndices = new Uint32Array(indices.length);
	for (let i = 0; i < indices.length; ++i) {
		relativeIndices[i] = indices[i] - start;
	}

	return {
		positions: slice(geometry.positions, 3)!,
		normals: slice(geometry.normals, 3),
		uvs: slice(geometry.uvs, 2),
		uvs2: slice(geometry.uvs2, 2),
		tangents: slice(geometry.tangents, 4),
		colors: slice(geometry.colors, 4),
		indices: relativeIndices,
		subMeshes: [
			{
				materialIndex: subMesh.materialIndex,
				verticesStart: 0,
				verticesCount: end - start,
				indexStart: 0,
				indexCount: relativeIndices.length,
			},
		],
	};
}
