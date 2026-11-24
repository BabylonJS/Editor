import { Mesh } from "babylonjs";

import { UpdateResourcesContext, UpdateResourcesCopyKey } from "./context";

/**
 * Replaces the geometry of the given mesh of the scene by the geometry of the given mesh of the asset: vertex data, sub-meshes
 * and the settings tied to the vertex data (unindexed, number of bone influencers, pose matrix, thin instances). The material,
 * the transform, the metadata (scripts) and everything else set in the editor are kept. The previous geometry is disposed if
 * no other mesh uses it.
 * The morph target manager of the mesh is removed as it depends on the vertices: it is replaced by updateMeshMorphTargets.
 * The skeleton is replaced by updateSkeletons.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the mesh of the scene belongs to.
 * @param sceneMesh defines the reference to the mesh of the scene to update.
 * @param assetMesh defines the reference to the mesh of the asset to take the geometry from.
 */
export function updateMeshGeometry(context: UpdateResourcesContext, copy: UpdateResourcesCopyKey, sceneMesh: Mesh, assetMesh: Mesh): void {
	const assetGeometry = assetMesh.geometry;
	if (!assetGeometry) {
		return;
	}

	// The thin instances of the asset win (EXT_mesh_gpu_instancing), else the thin instances of the scene are kept.
	const thinInstancesMatrices = getThinInstancesMatrices(assetMesh) ?? getThinInstancesMatrices(sceneMesh);

	sceneMesh.morphTargetManager = null;

	sceneMesh.geometry?.releaseForMesh(sceneMesh, true);
	sceneMesh.isUnIndexed = assetMesh.isUnIndexed;

	// The matrices of the thin instances are stored in the geometry: a mesh having thin instances needs its own geometry.
	context.getSceneGeometry(copy, assetGeometry, thinInstancesMatrices !== null).applyToMesh(sceneMesh);

	sceneMesh.releaseSubMeshes();
	assetMesh.subMeshes.forEach((subMesh) => subMesh.clone(sceneMesh, sceneMesh));

	if (thinInstancesMatrices) {
		sceneMesh.thinInstanceSetBuffer("matrix", thinInstancesMatrices, 16, true);
	}

	sceneMesh.numBoneInfluencers = assetMesh.numBoneInfluencers;
	sceneMesh.updatePoseMatrix(assetMesh.getPoseMatrix());
}

/**
 * Returns a copy of the world matrices of the thin instances of the given mesh, or null if the mesh has no thin instances.
 */
function getThinInstancesMatrices(mesh: Mesh): Float32Array | null {
	if (!mesh.hasThinInstances) {
		return null;
	}

	const matrices = mesh.thinInstanceGetWorldMatrices();
	const data = new Float32Array(matrices.length * 16);

	matrices.forEach((matrix, index) => matrix.copyToArray(data, index * 16));

	return data;
}
