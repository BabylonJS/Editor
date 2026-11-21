import { Mesh, Scene, Skeleton, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";

import { UpdateResourcesContext, UpdateResourcesCopyKey } from "./context";
import { getOrCreateSceneNode, registerMatchingAncestors } from "./nodes";

/**
 * Defines a mesh of the scene whose geometry was updated and whose skeleton must be updated accordingly.
 */
export interface ISkeletonUpdateRequest {
	/**
	 * Defines the copy of the asset the mesh belongs to.
	 */
	copy: UpdateResourcesCopyKey;
	/**
	 * Defines the reference to the mesh of the scene.
	 */
	sceneMesh: Mesh;
	/**
	 * Defines the reference to the mesh of the asset the geometry was taken from.
	 */
	assetMesh: Mesh;
	/**
	 * Defines the skeleton the mesh of the scene had before the update.
	 */
	previousSkeleton: Skeleton | null;
}

/**
 * Updates the skeletons of the given meshes of the scene, whose geometry was updated: the bone indices and weights of the new
 * geometry refer to the bones of the skeleton of the asset, so the meshes get a copy of that skeleton.
 * - the meshes of a copy updated from meshes sharing a skeleton in the asset share the same new skeleton,
 * - the bones are linked to the joints of the scene (matched nodes, or nodes linked to the matching bones of the previous
 *   skeleton) and the missing joints are created,
 * - the joints take the rest pose of the new skeleton so they fit the bind pose of the new geometry,
 * - the meshes updated from a mesh without skeleton lose their skeleton,
 * - the previous skeletons that are not used anymore are disposed, giving their identifiers to the skeleton replacing them.
 * @param context defines the context of the update.
 * @param requests defines the list of the meshes whose geometry was updated.
 */
export function updateSkeletons(context: UpdateResourcesContext, requests: ISkeletonUpdateRequest[]): void {
	const groups = new Map<string, ISkeletonUpdateRequest[]>();

	requests.forEach((request) => {
		const assetSkeleton = request.assetMesh.skeleton;
		if (!assetSkeleton) {
			request.sceneMesh.skeleton = null;
			return;
		}

		const key = `${request.copy?.index ?? "none"}/${assetSkeleton.uniqueId}`;
		groups.set(key, (groups.get(key) ?? []).concat(request));
	});

	const replacements = new Map<Skeleton, Skeleton>();

	groups.forEach((group) => {
		const skeleton = createSceneSkeleton(context, group);

		group.forEach((request) => {
			request.sceneMesh.skeleton = skeleton;

			if (request.previousSkeleton && !replacements.has(request.previousSkeleton)) {
				replacements.set(request.previousSkeleton, skeleton);
			}
		});
	});

	const previousSkeletons = new Set(requests.map((request) => request.previousSkeleton).filter((skeleton) => skeleton !== null) as Skeleton[]);
	disposeReplacedSkeletons(context.scene, previousSkeletons, replacements);
}

/**
 * Creates, in the scene, the copy of the skeleton of the asset used by the given group of meshes of the same copy.
 */
function createSceneSkeleton(context: UpdateResourcesContext, group: ISkeletonUpdateRequest[]): Skeleton {
	const { copy, sceneMesh, assetMesh } = group[0];
	const assetSkeleton = assetMesh.skeleton!;

	// The joints of the previous skeleton are reused: register them, and the nodes containing them, before linking the bones.
	const previousSkeleton = getMostUsedPreviousSkeleton(group);
	if (previousSkeleton) {
		context.getBoneMatches(copy, previousSkeleton, assetSkeleton).forEach((sceneBone, assetBone) => {
			const assetJoint = assetBone.getTransformNode();
			const sceneJoint = sceneBone.getTransformNode();

			if (assetJoint && sceneJoint && !context.hasNode(copy, assetJoint)) {
				context.registerNode(copy, assetJoint, sceneJoint);
				registerMatchingAncestors(context, copy, assetJoint, sceneJoint);
			}
		});
	}

	const skeleton = assetSkeleton.clone(assetSkeleton.name, Tools.RandomId());
	skeleton["_uniqueId"] = UniqueNumber.Get();

	// The cloned bones are in the same order as the bones of the asset.
	skeleton.bones.forEach((bone, index) => {
		const assetBone = assetSkeleton.bones[index];

		bone.id = Tools.RandomId();
		bone.uniqueId = UniqueNumber.Get();
		bone.length = assetBone.length;
		bone.metadata = assetBone.metadata;

		const assetJoint = assetBone.getTransformNode();
		bone.linkTransformNode(assetJoint ? getOrCreateSceneNode(context, copy, assetJoint, sceneMesh.parent) : null);

		context.registerBone(copy, assetBone, bone);
	});

	// The joints take the rest pose of the new skeleton, which fits the bind pose of the new geometry.
	skeleton.returnToRest();
	skeleton.prepare(true);

	++context.report.skeletons;

	return skeleton;
}

/**
 * Returns the skeleton used by most of the meshes of the given group before the update, or null if none had a skeleton.
 */
function getMostUsedPreviousSkeleton(group: ISkeletonUpdateRequest[]): Skeleton | null {
	const counts = new Map<Skeleton, number>();
	group.forEach((request) => {
		if (request.previousSkeleton) {
			counts.set(request.previousSkeleton, (counts.get(request.previousSkeleton) ?? 0) + 1);
		}
	});

	let result: Skeleton | null = null;
	let resultCount = 0;
	for (const [skeleton, count] of counts) {
		if (count > resultCount) {
			result = skeleton;
			resultCount = count;
		}
	}

	return result;
}

/**
 * Disposes the given previous skeletons that are not used by any mesh of the scene anymore. The skeleton replacing a disposed
 * skeleton takes its identifiers, so the references to the skeleton stay valid.
 */
function disposeReplacedSkeletons(scene: Scene, previousSkeletons: Set<Skeleton>, replacements: Map<Skeleton, Skeleton>): void {
	const renamedSkeletons = new Set<Skeleton>();

	previousSkeletons.forEach((previousSkeleton) => {
		if (scene.meshes.some((mesh) => mesh.skeleton === previousSkeleton)) {
			return;
		}

		const replacement = replacements.get(previousSkeleton);
		if (replacement && !renamedSkeletons.has(replacement)) {
			replacement.id = previousSkeleton.id;
			replacement["_uniqueId"] = previousSkeleton.uniqueId;

			renamedSkeletons.add(replacement);
		}

		previousSkeleton.dispose();
	});
}
