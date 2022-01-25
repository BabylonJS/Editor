import { FBXReaderNode } from "fbx-parser";
import { Material, Mesh, MultiMaterial, SubMesh } from "babylonjs";

import { IFBXLoaderRuntime } from "../loader";
import { IFBXConnections } from "../connections";

export class FBXMesh {
	/**
	 * Creates the given mesh according to the given relationships.
	 * @param runtime defines the reference to the current FBX runtime.
	 * @param node defines the mesh FBX node.
	 * @param connections defines the relationships of the FBX model node.
	 * @returns the reference to the mesh created.
	 */
	public static CreateMesh(runtime: IFBXLoaderRuntime, node: FBXReaderNode, connections: IFBXConnections): Mesh {
		const mesh = new Mesh(node.prop(1, "string")!, runtime.scene);

		const geometryId = connections.children.find((c) => runtime.cachedGeometries[c.id]);
		if (geometryId !== undefined) {
			const geometry = runtime.cachedGeometries[geometryId.id];
			geometry?.geometry.applyToMesh(mesh);

			if (geometry?.materialIndices?.length) {
				let startIndex = 0;
				let prevMaterialIndex = geometry.materialIndices[0];

				const baseSubMesh = mesh.subMeshes[0];
				mesh.subMeshes = [];

				geometry.materialIndices.forEach((currentIndex, i) => {
					if (currentIndex !== prevMaterialIndex) {
						const count = i - startIndex;
						new SubMesh(prevMaterialIndex, startIndex * 3, count * 3, startIndex, count, mesh, mesh, false, true);

						prevMaterialIndex = currentIndex;
						startIndex = i;
					}
				});

				if (mesh.subMeshes.length > 0) {
					const lastSubMesh = mesh.subMeshes[mesh.subMeshes.length - 1];
					const lastIndex = lastSubMesh.indexStart + lastSubMesh.indexCount;

					if (lastIndex !== geometry.materialIndices.length) {
						const count = geometry.materialIndices.length - lastIndex;
						new SubMesh(prevMaterialIndex, lastIndex * 3, count * 3, lastIndex, count, mesh, mesh, false, true);
					}
				} else {
					mesh.subMeshes.push(baseSubMesh);
				}
			}
		}

		mesh.computeWorldMatrix(true);

		// Material
		const materials: Material[] = [];
		connections.children.forEach((c) => {
			if (runtime.cachedMaterials[c.id]) {
				materials.push(runtime.cachedMaterials[c.id]);
			}
		});

		if (materials.length > 1) {
			const multiMaterial = new MultiMaterial(mesh.name, runtime.scene);
			materials.forEach((m) => multiMaterial.subMaterials.push(m));
			mesh.material = multiMaterial;
		} else if (materials.length > 0) {
			mesh.material = materials[0];
		}

		runtime.result.meshes.push(mesh);

		return mesh;
	}
}
