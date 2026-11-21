import { Mesh, Node, Vector3 } from "babylonjs";

import { isInstancedMesh, isMesh } from "../../../../../tools/guards/nodes";

import { getRatio, getWeightedAverage } from "./similarity";

/**
 * Defines the summary of a geometry used to recognize a mesh, even renamed: sizes, bounding box and skinning.
 */
export interface IGeometrySignature {
	/**
	 * Defines the number of vertices of the geometry.
	 */
	vertices: number;
	/**
	 * Defines the number of indices of the geometry.
	 */
	indices: number;
	/**
	 * Defines the minimum of the bounding box of the mesh, in local space.
	 */
	minimum: Vector3;
	/**
	 * Defines the maximum of the bounding box of the mesh, in local space.
	 */
	maximum: Vector3;
	/**
	 * Defines whether or not the mesh is skinned.
	 */
	skinned: boolean;
	/**
	 * Defines the number of morph targets of the mesh.
	 */
	morphTargets: number;
}

/**
 * Returns the mesh holding the geometry of the given node: the node itself for a mesh, its source mesh for an instance and
 * null for any other node or a mesh without geometry.
 * @param node defines the reference to the node to get the geometry mesh from.
 */
export function getGeometryMesh(node: Node | null | undefined): Mesh | null {
	if (!node) {
		return null;
	}

	const mesh = isInstancedMesh(node) ? node.sourceMesh : node;
	if (!isMesh(mesh) || !mesh.geometry || !mesh.getTotalVertices()) {
		return null;
	}

	return mesh;
}

/**
 * Returns whether or not the geometry of the given node of the scene can be updated from the given node of the asset. Only
 * meshes can be updated (instances follow their source mesh), from a node of the asset having a geometry.
 * @param sceneNode defines the reference to the node of the scene.
 * @param assetNode defines the reference to the node of the asset matched with the node of the scene.
 */
export function canUpdateGeometry(sceneNode: Node, assetNode: Node | null): boolean {
	return sceneNode.getClassName() === "Mesh" && getGeometryMesh(sceneNode) !== null && getGeometryMesh(assetNode) !== null;
}

/**
 * Computes the signature of the geometry of the given node, or returns null if the node has no geometry.
 * @param node defines the reference to the node (mesh or instance) to compute the geometry signature.
 */
export function getGeometrySignature(node: Node): IGeometrySignature | null {
	const mesh = getGeometryMesh(node);
	if (!mesh) {
		return null;
	}

	const boundingBox = mesh.getBoundingInfo().boundingBox;

	return {
		vertices: mesh.getTotalVertices(),
		indices: mesh.getTotalIndices(),
		minimum: boundingBox.minimum.clone(),
		maximum: boundingBox.maximum.clone(),
		skinned: !!mesh.skeleton,
		morphTargets: mesh.morphTargetManager?.numTargets ?? 0,
	};
}

/**
 * Returns how much the two given geometries look alike, from 0 to 1. The size of the bounding box weighs the most as it
 * barely changes when an artist tweaks a mesh, then come the number of vertices and indices, the center of the bounding
 * box and the skinning.
 * @param a defines the signature of the first geometry.
 * @param b defines the signature of the second geometry.
 */
export function getGeometrySimilarity(a: IGeometrySignature, b: IGeometrySignature): number {
	const sizeA = a.maximum.subtract(a.minimum);
	const sizeB = b.maximum.subtract(b.minimum);

	// Flat meshes (planes, decals...) have an axis close to zero: compare the axes relatively to the largest one.
	const largest = Math.max(sizeA.x, sizeA.y, sizeA.z, sizeB.x, sizeB.y, sizeB.z, 1e-6);
	const epsilon = largest * 0.01;

	const size = (getRatio(sizeA.x, sizeB.x, epsilon) + getRatio(sizeA.y, sizeB.y, epsilon) + getRatio(sizeA.z, sizeB.z, epsilon)) / 3;

	const centerA = a.minimum.add(a.maximum).scaleInPlace(0.5);
	const centerB = b.minimum.add(b.maximum).scaleInPlace(0.5);
	const center = Math.max(0, 1 - Vector3.Distance(centerA, centerB) / largest);

	const features = (a.skinned === b.skinned ? 0.5 : 0) + (a.morphTargets === b.morphTargets ? 0.5 : 0);

	return getWeightedAverage([
		[getRatio(a.vertices, b.vertices), 2.5],
		[getRatio(a.indices, b.indices), 1.5],
		[size, 3.5],
		[center, 1.5],
		[features, 1],
	]);
}
