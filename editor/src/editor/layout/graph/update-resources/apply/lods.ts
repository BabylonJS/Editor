import { Mesh, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";

import { hasLodLevels, matchLodLevels } from "../match/lods";

import { updateMeshGeometry } from "./geometry";
import { ISkeletonUpdateRequest } from "./skeletons";
import { updateMeshMorphTargets } from "./morph-targets";
import { UpdateResourcesContext, UpdateResourcesCopyKey } from "./context";

/**
 * Updates the LOD levels of the given mesh of the scene from the LOD levels of the given mesh of the asset, once the mesh
 * itself has been updated. Only the LODs coming from the asset are concerned: nothing is done when the mesh of the asset has
 * no LODs, as the LODs of the scene were then added in the editor.
 * - the LOD levels found in the asset are updated like meshes (geometry, morph targets and skeleton) and keep their distance,
 *   which can be tuned in the editor,
 * - the LOD levels of the asset not found in the scene are added with their distance in the asset,
 * - the LOD levels of the scene not found in the asset are kept, unless the user chose to remove them.
 * The levels without mesh (hiding the mesh beyond a distance) are ignored: the editor doesn't save them. The LOD meshes use
 * the material of their mesh, as when the editor loads a scene.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the mesh belongs to.
 * @param sceneMesh defines the reference to the mesh of the scene, already updated.
 * @param assetMesh defines the reference to the mesh of the asset the mesh was updated from.
 * @param skeletonRequests defines the list of the meshes whose skeleton must be updated, completed with the LOD meshes.
 * @param updatedMeshes defines the list of the updated meshes, completed with the LOD meshes.
 */
export function updateMeshLods(
	context: UpdateResourcesContext,
	copy: UpdateResourcesCopyKey,
	sceneMesh: Mesh,
	assetMesh: Mesh,
	skeletonRequests: ISkeletonUpdateRequest[],
	updatedMeshes: Mesh[]
): void {
	if (!hasLodLevels(assetMesh)) {
		return;
	}

	const match = matchLodLevels(sceneMesh, assetMesh);

	match.pairs.forEach(({ scene, asset }) => {
		updateLodMesh(context, copy, sceneMesh, scene.mesh, asset.mesh, skeletonRequests);
		updatedMeshes.push(scene.mesh);
		++context.report.lods;
	});

	match.unmatched.forEach(({ mesh }) => {
		if (context.analysis.removedLodMeshes.has(mesh)) {
			sceneMesh.removeLODLevel(mesh);
			mesh.dispose(false, false);
			++context.report.removedLods;
		}
	});

	// A mesh getting its first LODs takes the switching mode (distance or screen coverage) of the asset.
	if (!sceneMesh.getLODLevels().length) {
		sceneMesh.useLODScreenCoverage = assetMesh.useLODScreenCoverage;
	}

	match.added.forEach(({ mesh, distance }) => {
		const lodMesh = new Mesh(mesh.name, context.scene);
		lodMesh.id = Tools.RandomId();
		lodMesh.uniqueId = UniqueNumber.Get();
		lodMesh.receiveShadows = sceneMesh.receiveShadows;

		updateLodMesh(context, copy, sceneMesh, lodMesh, mesh, skeletonRequests);
		sceneMesh.addLODLevel(distance, lodMesh);

		updatedMeshes.push(lodMesh);
		++context.report.lods;
	});
}

/**
 * Updates the given LOD mesh of the scene from the given LOD mesh of the asset, like a mesh: geometry, morph targets and
 * skeleton (requested), and gives it the material of its mesh.
 */
function updateLodMesh(
	context: UpdateResourcesContext,
	copy: UpdateResourcesCopyKey,
	sceneMesh: Mesh,
	sceneLodMesh: Mesh,
	assetLodMesh: Mesh,
	skeletonRequests: ISkeletonUpdateRequest[]
): void {
	const previousSkeleton = sceneLodMesh.skeleton;
	const previousManager = sceneLodMesh.morphTargetManager;

	updateMeshGeometry(context, copy, sceneLodMesh, assetLodMesh);
	updateMeshMorphTargets(context, copy, sceneLodMesh, assetLodMesh, previousManager);

	sceneLodMesh.material = sceneMesh.material;

	skeletonRequests.push({ copy, previousSkeleton, sceneMesh: sceneLodMesh, assetMesh: assetLodMesh });
}
