import { AbstractMesh, VertexBuffer, VertexData, Matrix, Quaternion, Vector3 } from "babylonjs";

import { isMesh } from "../guards/nodes";

/**
 * Convert of the given meshes that have geometry to left-handed as they come from glTF loader.
 * This is mainly used to remove the "__root__" proxy mesh.
 */
export function convertGltfMeshesToLeftHanded(meshes: AbstractMesh[]) {
	meshes.forEach((mesh) => {
		if (!isMesh(mesh) || !mesh.geometry) {
			return;
		}

		const geometry = mesh.geometry;

		const indices = mesh.getIndices()?.slice();
		const positions = mesh.getVerticesData(VertexBuffer.PositionKind)?.slice();

		if (!indices || !positions) {
			return;
		}

		const matrix = Matrix.Compose(new Vector3(-1, 1, 1), Quaternion.Identity(), Vector3.Zero());

		for (let i = 0, len = indices.length; i < len; i += 3) {
			const tmp = indices[i + 1];
			indices[i + 1] = indices[i + 2];
			indices[i + 2] = tmp;
		}

		geometry.setIndices(indices, geometry.getTotalVertices(), false);

		VertexData["_TransformVector3Coordinates"](positions, matrix);
		geometry.setVerticesData(VertexBuffer.PositionKind, positions, false);

		const normals = mesh.getVerticesData(VertexBuffer.NormalKind)?.slice();
		if (normals) {
			VertexData["_TransformVector3Normals"](normals, matrix);
			mesh.setVerticesData(VertexBuffer.NormalKind, normals, false);
		}

		const tangents = mesh.getVerticesData(VertexBuffer.TangentKind)?.slice();
		if (tangents) {
			VertexData["_TransformVector4Normals"](tangents, matrix);
			mesh.setVerticesData(VertexBuffer.TangentKind, tangents, false);
		}
	});
}
