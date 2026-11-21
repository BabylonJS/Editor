import { Node, Scene, Skeleton } from "babylonjs";

import { getRemovableNodeItems } from "../match/removal";

import { IUpdateResourcesAnalysis, IUpdateResourcesReport } from "../types";

/**
 * Returns the nodes to remove from the scene once the resources are updated: the nodes not found in the asset that the user
 * selected (see getRemovableNodeItems), without the ones removed with a selected ancestor. A node is kept, with a warning,
 * when it or one of its descendants is still a joint of a skeleton used by meshes that are not removed with it: the skeleton
 * would be broken. Removing the nodes is done by the caller, with the editor, so it can be undone.
 * @param scene defines the reference to the updated scene.
 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
 * @param report defines the report of the update, completed with the warnings.
 */
export function getNodesToRemove(scene: Scene, analysis: IUpdateResourcesAnalysis, report: IUpdateResourcesReport): Node[] {
	const selectedNodes: Node[] = getRemovableNodeItems(analysis)
		.filter((item) => item.remove)
		.map((item) => item.node);

	const skeletonsByJoint = new Map<Node, Skeleton[]>();
	scene.skeletons.forEach((skeleton) => {
		skeleton.bones.forEach((bone) => {
			const joint = bone.getTransformNode();
			if (joint) {
				skeletonsByJoint.set(joint, (skeletonsByJoint.get(joint) ?? []).concat(skeleton));
			}
		});
	});

	return selectedNodes.filter((node) => {
		if (selectedNodes.some((other) => other !== node && node.isDescendantOf(other))) {
			return false;
		}

		const removedNodes = new Set<Node>([node, ...node.getDescendants(false)]);

		for (const removedNode of removedNodes) {
			const skeleton = skeletonsByJoint.get(removedNode)?.find((usedSkeleton) => {
				return scene.meshes.some((mesh) => mesh.skeleton === usedSkeleton && !removedNodes.has(mesh));
			});

			if (skeleton) {
				report.warnings.push(`"${node.name}" was not removed: "${removedNode.name}" is still a joint of the skeleton "${skeleton.name}".`);
				return false;
			}
		}

		return true;
	});
}
