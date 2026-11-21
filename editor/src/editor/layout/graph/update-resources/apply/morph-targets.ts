import { Mesh, MorphTargetManager, Scene, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";

import { matchMorphTargets } from "../match/morph-targets";

import { UpdateResourcesContext, UpdateResourcesCopyKey } from "./context";

/**
 * Gives the given mesh of the scene a copy of the morph target manager of the given mesh of the asset, once its geometry has
 * been updated (morph targets must have as many vertices as the geometry). The morph targets are configured as when the
 * asset is imported (new identifiers, name prefixed by the name of the mesh) and keep the influence of the morph target they
 * replace, so poses set in the editor are kept. The previous morph target manager is disposed if no other mesh uses it.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the mesh belongs to.
 * @param sceneMesh defines the reference to the mesh of the scene, already updated by updateMeshGeometry.
 * @param assetMesh defines the reference to the mesh of the asset.
 * @param previousManager defines the morph target manager the mesh of the scene had before its geometry was updated.
 */
export function updateMeshMorphTargets(
	context: UpdateResourcesContext,
	copy: UpdateResourcesCopyKey,
	sceneMesh: Mesh,
	assetMesh: Mesh,
	previousManager: MorphTargetManager | null
): void {
	const assetManager = assetMesh.morphTargetManager;

	if (assetManager) {
		const previousTargets = previousManager ? matchMorphTargets(previousManager, assetManager) : null;

		const manager = assetManager.clone();
		manager["_uniqueId"] = UniqueNumber.Get();

		for (let i = 0; i < manager.numTargets; ++i) {
			const target = manager.getTarget(i);
			const assetTarget = assetManager.getTarget(i);

			target.id = Tools.RandomId();
			target["_uniqueId"] = UniqueNumber.Get();
			target.name = `${sceneMesh.name}_${assetTarget.name}`;
			target.morphTargetManager = manager;
			target.influence = previousTargets?.get(assetTarget)?.influence ?? assetTarget.influence;

			context.registerMorphTarget(copy, assetTarget, target);
		}

		sceneMesh.morphTargetManager = manager;
		++context.report.morphTargetManagers;
	}

	disposeMorphTargetManagerIfUnused(context.scene, previousManager);
}

/**
 * Disposes the given morph target manager if no mesh of the scene uses it anymore.
 */
function disposeMorphTargetManagerIfUnused(scene: Scene, manager: MorphTargetManager | null): void {
	if (manager && !scene.meshes.some((mesh) => mesh.morphTargetManager === manager)) {
		manager.dispose();
	}
}
