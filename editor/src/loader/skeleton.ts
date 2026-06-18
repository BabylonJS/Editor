import { Bone, Skeleton, Tools } from "babylonjs";

import { AssimpJSRuntime } from "./types";

/**
 * Builds the skeleton (if the file contains skinned meshes) from the previously parsed node hierarchy.
 *
 * Assimp/FBX encodes bone offsets in intermediate `$AssimpFbx$` helper nodes that sit *between* the actual bones in the
 * node tree (translation, pre-rotation, etc.). To keep the bind pose correct, every node on the path from a skinning
 * bone up to the common root is turned into a Babylon.js bone. The bones referenced by the meshes' vertex weights are a
 * subset of those bones; the helper bones simply carry the in-between transforms so the absolute (world) bind matrices
 * match the mesh's bind pose.
 *
 * Each bone is linked to its corresponding `TransformNode`. Animating those transform nodes (see `animation.ts`) makes
 * the skeleton follow along, which also unifies skinned and non-skinned animation handling.
 *
 * On return, `runtime.skeleton` and `runtime.boneIndexByName` are populated.
 * @param runtime defines the current import runtime.
 */
export function buildSkeleton(runtime: AssimpJSRuntime): void {
	// Collect all the bone names referenced by the meshes' vertex weights.
	const skinningBoneNames = new Set<string>();
	runtime.data.meshes?.forEach((mesh) => {
		mesh.bones?.forEach((bone) => skinningBoneNames.add(bone.name));
	});

	if (!skinningBoneNames.size) {
		return;
	}

	// Expand the set with every ancestor of each skinning bone. This captures the `$AssimpFbx$` helper nodes that hold
	// the bone offsets as well as the chain up to the common root, guaranteeing a single-rooted, correct hierarchy.
	const skeletonNodeNames = new Set<string>();
	skinningBoneNames.forEach((name) => {
		let current: string | null = name;
		while (current && runtime.nodes.has(current) && !skeletonNodeNames.has(current)) {
			skeletonNodeNames.add(current);
			current = runtime.nodes.get(current)!.parentName;
		}
	});

	const skeleton = new Skeleton("skeleton", Tools.RandomId(), runtime.scene);
	runtime.container.skeletons.push(skeleton);

	const boneByName = new Map<string, Bone>();

	// Create the bones in depth-first order so a bone's parent always exists before the bone itself.
	runtime.orderedNodeNames.forEach((name) => {
		if (!skeletonNodeNames.has(name)) {
			return;
		}

		const info = runtime.nodes.get(name)!;

		// Find the nearest ancestor that is part of the skeleton (it is always the direct parent here, since every
		// ancestor up to the root has been added to the skeleton, but we walk up defensively).
		let parentName = info.parentName;
		while (parentName && !skeletonNodeNames.has(parentName)) {
			parentName = runtime.nodes.get(parentName)?.parentName ?? null;
		}

		const parentBone = parentName ? (boneByName.get(parentName) ?? null) : null;

		// localMatrix == restMatrix == bindMatrix: the parsed hierarchy is the bind pose. Babylon derives the absolute
		// inverse bind matrices from these, which matches the offset matrices exported by Assimp.
		const bone = new Bone(name, skeleton, parentBone, info.localMatrix, info.localMatrix.clone(), info.localMatrix.clone(), null);
		bone.linkTransformNode(info.node);

		boneByName.set(name, bone);
	});

	skeleton.bones.forEach((bone, index) => runtime.boneIndexByName.set(bone.name, index));

	runtime.skeleton = skeleton;
}
