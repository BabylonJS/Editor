import { Bone, Geometry, Mesh, MultiMaterial, Skeleton, SubMesh, Tools, VertexData } from "babylonjs";

import { UniqueNumber } from "../tools/tools";

import { AssimpJSRuntime, IAssimpJSNodeData } from "./types";

export function parseMesh(runtime: AssimpJSRuntime, data: IAssimpJSNodeData): Mesh {
	const mesh = new Mesh(data.name, runtime.scene);
	mesh.subMeshes ??= [];
	mesh.receiveShadows = true;

	mesh.id = Tools.RandomId();
	mesh.uniqueId = UniqueNumber.Get();

	const meshes = data.meshes!.map((meshIndex) => runtime.data.meshes![meshIndex]);

	const subMeshes: SubMesh[] = [];
	const vertexData = new VertexData();

	// Common
	vertexData.positions = meshes.map((m) => m.vertices).flat();

	if (!meshes.find((m) => !m.normals)) {
		vertexData.normals = meshes.map((m) => m.normals!).flat();
	}

	// UVs
	meshes.forEach((m) => {
		const textureCoordsLength = m.texturecoords?.length ?? 0;
		for (let i = 0; i < textureCoordsLength; ++i) {
			const uvs = i > 0 ? `uvs${i + 1}` : "uvs";
			vertexData[uvs] = m.texturecoords![i];
		}
	});

	// Indices
	const indices = meshes.map((m) => m.faces.flat());

	let offset = 0;
	indices.forEach((i, index) => {
		const verticesStart = offset;
		const verticesCount = i.length;

		const indicesStart = offset;
		const indicesCount = i.length;

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

	// Bones
	const hasBones = !meshes.find((m) => !m.bones);

	if (hasBones) {
		const skeleton = new Skeleton(data.name, Tools.RandomId(), runtime.scene);
		runtime.container.skeletons.push(skeleton);

		const allMatricesIndices = new Array(meshes.length);
		const allMatricesWeights = new Array(meshes.length);

		meshes.forEach((meshData) => {
			const map: { boneIndex: number; weight: number }[][] = [];

			meshData.bones?.forEach((boneData, boneIndex) => {
				let bone = skeleton.bones.find((bone) => bone.name === boneData.name);
				if (!bone) {
					bone = new Bone(boneData.name, skeleton);

					if (boneData.offsetmatrix) {
						// TODO handle offset matrix
					}

					const transformNode = runtime.container.transformNodes.find((transformNode) => {
						return transformNode.name === boneData.name;
					});

					if (transformNode) {
						bone.linkTransformNode(transformNode);

						if (transformNode.parent) {
							const parentBone = skeleton.bones.find((b) => b.name === transformNode.parent!.name);
							if (parentBone) {
								bone.setParent(parentBone);
							}
						}
					}
				}

				boneData.weights.forEach((w) => {
					const d = map[w[0]] ?? [];
					d.push({ boneIndex, weight: w[1] });

					map[w[0]] = d;
				});
			});

			map.forEach((m) => {
				while (m.length < 4) {
					m.push({ boneIndex: 0, weight: 0 });
				}
			});

			allMatricesWeights.push(map.map((m) => m.map((m) => m.weight)).flat());
			allMatricesIndices.push(map.map((m) => m.map((m) => m.boneIndex)).flat());
		});

		vertexData.matricesIndices = allMatricesIndices.flat();
		vertexData.matricesWeights = allMatricesWeights.flat();

		skeleton.returnToRest();

		mesh.skeleton = skeleton;
	}

	const geometry = new Geometry(Tools.RandomId(), runtime.scene, vertexData, false);
	geometry.toLeftHanded();
	geometry.applyToMesh(mesh);

	mesh.subMeshes = subMeshes;

	runtime.container.meshes.push(mesh);
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

	return mesh;
}
