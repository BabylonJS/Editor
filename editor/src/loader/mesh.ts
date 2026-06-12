import { Geometry, MultiMaterial, SubMesh, Tools, VertexData } from "babylonjs";

import { AssimpJSRuntime, IAssimpJSMeshData, IAssimpMeshNode } from "./types";

/**
 * Builds the geometry (and skinning data) of a mesh node. This is the second pass of the import: it runs after the
 * skeleton has been created so the per-vertex bone indices can be resolved to the final skeleton bone indices.
 * @param runtime defines the current import runtime.
 * @param meshNode defines the mesh node (Babylon mesh + Assimp data) to build the geometry for.
 */
export function buildMeshGeometry(runtime: AssimpJSRuntime, meshNode: IAssimpMeshNode): void {
	const { mesh, data } = meshNode;

	mesh.subMeshes = [];

	const meshes = data.meshes!.map((meshIndex) => runtime.data.meshes![meshIndex]);

	const subMeshes: SubMesh[] = [];
	const vertexData = new VertexData();

	// Positions
	vertexData.positions = meshes.map((m) => m.vertices).flat();

	// Normals (only if every sub-mesh provides them)
	if (!meshes.find((m) => !m.normals)) {
		vertexData.normals = meshes.map((m) => m.normals!).flat();
	}

	// UVs
	meshes.forEach((m) => {
		const textureCoordsLength = m.texturecoords?.length ?? 0;
		for (let i = 0; i < textureCoordsLength; ++i) {
			const uvs = i > 0 ? `uvs${i + 1}` : "uvs";
			if (vertexData[uvs]) {
				vertexData[uvs] = vertexData[uvs].concat(m.texturecoords![i]);
			} else {
				vertexData[uvs] = m.texturecoords![i];
			}
		}
	});

	// Indices (offset each sub-mesh's indices by the number of vertices already added)
	const indices = meshes.map((m) => m.faces.flat());

	let offset = 0;
	let indicesOffset = 0;
	indices.forEach((i, index) => {
		const verticesStart = offset;
		const verticesCount = i.length;

		const indicesStart = offset;
		const indicesCount = i.length;

		if (index > 0) {
			indicesOffset += meshes[index - 1].vertices.length / 3;

			for (let j = 0, len = i.length; j < len; ++j) {
				i[j] += indicesOffset;
			}
		}

		subMeshes.push(new SubMesh(index, verticesStart, verticesCount, indicesStart, indicesCount, mesh, mesh, false, true));

		offset += i.length;
	});

	vertexData.indices = indices.flat();

	// Indices are in clockwise order, but Babylon.js expects counter-clockwise
	if (vertexData.indices) {
		for (let i = 0, len = vertexData.indices.length; i < len; i += 3) {
			const tmp = vertexData.indices[i + 1];
			vertexData.indices[i + 1] = vertexData.indices[i + 2];
			vertexData.indices[i + 2] = tmp;
		}
	}

	// Skinning
	const isSkinned = !!runtime.skeleton && meshes.some((m) => m.bones?.length);
	if (isSkinned) {
		applySkinning(runtime, meshes, vertexData);
	}

	const geometry = new Geometry(Tools.RandomId(), runtime.scene, vertexData, false);
	geometry.toLeftHanded();
	geometry.applyToMesh(mesh);

	mesh.subMeshes = subMeshes;

	if (isSkinned) {
		mesh.skeleton = runtime.skeleton;
	}

	runtime.container.geometries.push(geometry);

	// Apply material
	if (data.meshes!.length > 1) {
		const material = new MultiMaterial(Tools.RandomId(), runtime.scene);

		data.meshes!.forEach((meshIndex) => {
			const materialIndex = runtime.data.meshes?.[meshIndex].materialindex ?? null;
			if (materialIndex !== null) {
				material.subMaterials.push(runtime.materials[materialIndex] ?? null);
			}
		});

		mesh.material = material;
		runtime.container.multiMaterials.push(material);
	} else {
		const materialIndex = runtime.data.meshes?.[data.meshes![0]].materialindex ?? null;
		if (materialIndex !== null) {
			mesh.material = runtime.materials[materialIndex] ?? null;
		}
	}
}

/**
 * Fills the `matricesIndices`/`matricesWeights` of the given vertex data from the per-sub-mesh bone weights, remapping
 * the (per-mesh) bone references to the shared skeleton's bone indices and offsetting vertex ids per sub-mesh.
 */
function applySkinning(runtime: AssimpJSRuntime, meshes: IAssimpJSMeshData[], vertexData: VertexData): void {
	const totalVertices = vertexData.positions!.length / 3;

	// influences[vertexId] = list of { boneIndex, weight }
	const influences: { boneIndex: number; weight: number }[][] = new Array(totalVertices);

	let vertexOffset = 0;
	meshes.forEach((meshData) => {
		meshData.bones?.forEach((boneData) => {
			const boneIndex = runtime.boneIndexByName.get(boneData.name);
			if (boneIndex === undefined) {
				return;
			}

			boneData.weights.forEach(([vertexId, weight]) => {
				const globalVertexId = vertexOffset + vertexId;
				(influences[globalVertexId] ??= []).push({ boneIndex, weight });
			});
		});

		vertexOffset += meshData.vertices.length / 3;
	});

	const matricesIndices = new Array<number>(totalVertices * 4).fill(0);
	const matricesWeights = new Array<number>(totalVertices * 4).fill(0);

	for (let v = 0; v < totalVertices; ++v) {
		let list = influences[v] ?? [];

		// Babylon supports up to 4 influences per vertex: keep the 4 strongest and renormalize.
		list.sort((a, b) => b.weight - a.weight);
		list = list.slice(0, 4);

		const sum = list.reduce((s, i) => s + i.weight, 0);
		if (sum <= 0) {
			// Vertex without any influence: bind it to the root bone so it follows the skeleton instead of staying put.
			matricesWeights[v * 4] = 1;
			continue;
		}

		for (let k = 0; k < list.length; ++k) {
			matricesIndices[v * 4 + k] = list[k].boneIndex;
			matricesWeights[v * 4 + k] = list[k].weight / sum;
		}
	}

	vertexData.matricesIndices = matricesIndices;
	vertexData.matricesWeights = matricesWeights;
}
