import { Mesh, Node } from "babylonjs";

import { IUpdateResourcesAnalysis, IUpdateResourcesNodeItem } from "../types";

import { hasLodLevels, matchLodLevels } from "./lods";
import { canUpdateGeometry, getGeometryMesh } from "./geometry";

/**
 * Defines a LOD mesh of the scene that can be removed because it was not found in the LODs of the asset.
 */
export interface IRemovableLodMesh {
	/**
	 * Defines the item of the mesh of the scene the LOD mesh is a LOD level of.
	 */
	master: IUpdateResourcesNodeItem;
	/**
	 * Defines the reference to the LOD mesh.
	 */
	mesh: Mesh;
}

/**
 * Returns the nodes of the copies of the asset that were not found in the asset and that can be removed: deleted by the artist,
 * or added in the editor (nothing tells them apart, so nothing is removed by default). The roots of the copies are never
 * removable, nor the nodes containing matched nodes as they would be removed with them.
 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
 */
export function getRemovableNodeItems(analysis: IUpdateResourcesAnalysis): IUpdateResourcesNodeItem[] {
	const containingMatchedNodes = new Set<Node>();

	analysis.nodes.forEach((item) => {
		if (!item.match) {
			return;
		}

		for (let parent = item.node.parent; parent && !containingMatchedNodes.has(parent); parent = parent.parent) {
			containingMatchedNodes.add(parent);
		}
	});

	return analysis.nodes.filter((item) => item.copy && !item.isCopyRoot && !item.match && !containingMatchedNodes.has(item.node));
}

/**
 * Returns the LOD meshes of the scene that can be removed: the LOD levels of the meshes selected to be updated that are not
 * found in the LODs of their mesh of the asset (removed by the artist, or added in the editor). Only the meshes updated from
 * a mesh of the asset having LODs are considered: the LODs of the other meshes are never touched.
 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
 */
export function getRemovableLodMeshes(analysis: IUpdateResourcesAnalysis): IRemovableLodMesh[] {
	const result: IRemovableLodMesh[] = [];

	analysis.nodes.forEach((item) => {
		if (!item.updateGeometry || !canUpdateGeometry(item.node, item.match)) {
			return;
		}

		const assetMesh = getGeometryMesh(item.match);
		if (!assetMesh || !hasLodLevels(assetMesh)) {
			return;
		}

		matchLodLevels(item.node as Mesh, assetMesh).unmatched.forEach((level) => {
			result.push({ master: item, mesh: level.mesh });
		});
	});

	return result;
}
