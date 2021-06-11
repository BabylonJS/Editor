import { FBXReaderNode } from "fbx-parser";
import { Mesh} from "babylonjs";

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
			geometry.applyToMesh(mesh);
		}
		
		mesh.computeWorldMatrix(true);

		// Material
		const materialId = connections.children.find((c) => runtime.cachedMaterials[c.id])?.id;
		if (materialId) {
			mesh.material = runtime.cachedMaterials[materialId];
		}

		runtime.result.meshes.push(mesh);
		
		return mesh;
	}
}
