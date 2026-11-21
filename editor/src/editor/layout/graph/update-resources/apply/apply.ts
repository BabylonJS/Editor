import { Mesh, Scene } from "babylonjs";

import { canUpdateGeometry, getGeometryMesh } from "../match/geometry";

import { IUpdateResourcesAnalysis, IUpdateResourcesReport } from "../types";

import { updateMeshLods } from "./lods";
import { updateNodeTransform } from "./nodes";
import { UpdateResourcesContext } from "./context";
import { updateMeshGeometry } from "./geometry";
import { updateMeshMorphTargets } from "./morph-targets";
import { updateAnimationGroup } from "./animation-groups";
import { ISkeletonUpdateRequest, updateSkeletons } from "./skeletons";
import { disposeReplacedMaterials, updateMeshMaterial } from "./materials";

/**
 * Updates the resources of the scene from the asset, following the matches and choices of the given analysis:
 * 1. the geometries of the selected meshes, with their morph targets, their material (if chosen) and their LODs,
 * 2. the skeletons of the updated meshes (bones, joints and rest pose), as the new geometries refer to the bones of the asset,
 * 3. the parents and transforms of the selected nodes (except the roots of the copies, which place the copies in the scene),
 * 4. the selected animation groups, retargeted to the updated objects,
 * 5. the replaced materials that are not used anymore are disposed.
 * The steps are run in that order so the animations are retargeted to the new skeletons and morph targets. The nodes not
 * found in the asset are not removed here: see getNodesToRemove.
 * @param scene defines the reference to the scene to update.
 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
 * @returns the report of what was done, with the problems met.
 */
export function applyResourcesUpdate(scene: Scene, analysis: IUpdateResourcesAnalysis): IUpdateResourcesReport {
	const context = new UpdateResourcesContext(scene, analysis);

	const updatedMeshes: Mesh[] = [];
	const skeletonRequests: ISkeletonUpdateRequest[] = [];

	analysis.nodes.forEach((item) => {
		if (!item.updateGeometry || !canUpdateGeometry(item.node, item.match)) {
			return;
		}

		const sceneMesh = item.node as Mesh;
		const assetMesh = getGeometryMesh(item.match)!;

		const previousSkeleton = sceneMesh.skeleton;
		const previousManager = sceneMesh.morphTargetManager;

		try {
			updateMeshGeometry(context, item.copy, sceneMesh, assetMesh);
			updateMeshMorphTargets(context, item.copy, sceneMesh, assetMesh, previousManager);

			if (analysis.updateMaterials) {
				updateMeshMaterial(context, sceneMesh, assetMesh);
			}

			updatedMeshes.push(sceneMesh);
			skeletonRequests.push({ sceneMesh, assetMesh, previousSkeleton, copy: item.copy });
			++context.report.geometries;

			updateMeshLods(context, item.copy, sceneMesh, assetMesh, skeletonRequests, updatedMeshes);
		} catch (e) {
			context.warn(`Failed to update the geometry of "${sceneMesh.name}": ${(e as Error).message}`);
		}
	});

	try {
		updateSkeletons(context, skeletonRequests);
	} catch (e) {
		context.warn(`Failed to update the skeletons: ${(e as Error).message}`);
	}

	analysis.nodes.forEach((item) => {
		if (item.updateTransform && item.match && !item.isCopyRoot) {
			updateNodeTransform(context, item.copy, item.node, item.match);
			++context.report.transforms;
		}
	});

	analysis.animationGroups.forEach((item) => {
		if (!item.update || !item.match) {
			return;
		}

		try {
			updateAnimationGroup(context, item);
		} catch (e) {
			context.warn(`Failed to update the animation group "${item.match.name}": ${(e as Error).message}`);
		}
	});

	disposeReplacedMaterials(context);

	updatedMeshes.forEach((mesh) => {
		mesh.computeWorldMatrix(true);
		mesh.refreshBoundingInfo(true, true);
	});

	return context.report;
}
