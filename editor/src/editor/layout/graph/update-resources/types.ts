import { AnimationGroup, AssetContainer, Mesh, TransformNode } from "babylonjs";

/**
 * Defines why an object of the scene was matched with an object of the asset:
 * - "root": the node is the root of a copy of the asset found in the scene,
 * - "exact": same name,
 * - "name": same name once normalized (case, separators, namespaces, duplicate suffixes, order of the words, sides),
 * - "structure": only remaining candidate at the same place of the hierarchy,
 * - "similar": best similarity score (name, geometry, hierarchy, position...),
 * - "manual": chosen by the user,
 * - "none": no match found.
 */
export type UpdateResourcesMatchReason = "root" | "exact" | "name" | "structure" | "similar" | "manual" | "none";

/**
 * Defines a copy of the asset found in the scene. The same asset can be instantiated several times in the scene: each copy
 * is matched and updated independently.
 */
export interface IUpdateResourcesCopy {
	/**
	 * Defines the index of the copy, used to identify it in the dialog.
	 */
	index: number;
	/**
	 * Defines the node of the scene at the root of the copy. Its transform is never updated: it places the copy in the scene.
	 */
	sceneRoot: TransformNode;
	/**
	 * Defines the node of the asset the root of the copy corresponds to.
	 */
	assetRoot: TransformNode;
}

/**
 * Defines a node of the edited hierarchy, the node of the asset it is matched with and what must be updated from it.
 */
export interface IUpdateResourcesNodeItem {
	/**
	 * Defines the unique key of the item, used by the dialog.
	 */
	key: string;
	/**
	 * Defines the reference to the node of the scene (mesh, instance or transform node).
	 */
	node: TransformNode;
	/**
	 * Defines the depth of the node in the edited hierarchy, used to indent the lists of the dialog.
	 */
	depth: number;
	/**
	 * Defines the copy of the asset the node belongs to, or null if the node is not part of any copy found in the scene.
	 */
	copy: IUpdateResourcesCopy | null;
	/**
	 * Defines whether or not the node is the root of its copy.
	 */
	isCopyRoot: boolean;
	/**
	 * Defines the node of the asset matched with the node of the scene, or null if no match was found.
	 */
	match: TransformNode | null;
	/**
	 * Defines why the node was matched with the node of the asset.
	 */
	reason: UpdateResourcesMatchReason;
	/**
	 * Defines the confidence of the match, from 0 to 1.
	 */
	score: number;
	/**
	 * Defines whether or not the geometry of the mesh (with its skeleton, morph targets and LODs) must be updated.
	 */
	updateGeometry: boolean;
	/**
	 * Defines whether or not the parent and the transform (position, rotation and scaling) of the node must be updated.
	 */
	updateTransform: boolean;
	/**
	 * Defines whether or not the node, not found in the asset, must be removed from the scene (with its descendants).
	 */
	remove: boolean;
}

/**
 * Defines an animation group of a copy of the asset in the scene, the animation group of the asset it is matched with and
 * whether or not it must be updated.
 */
export interface IUpdateResourcesAnimationGroupItem {
	/**
	 * Defines the unique key of the item, used by the dialog.
	 */
	key: string;
	/**
	 * Defines the copy of the asset animated by the animation group.
	 */
	copy: IUpdateResourcesCopy;
	/**
	 * Defines the reference to the animation group of the scene to update, or null when the animation group of the asset
	 * doesn't exist yet in the scene and must be added.
	 */
	animationGroup: AnimationGroup | null;
	/**
	 * Defines the animation group of the asset matched with the animation group of the scene.
	 */
	match: AnimationGroup | null;
	/**
	 * Defines why the animation group was matched with the animation group of the asset.
	 */
	reason: UpdateResourcesMatchReason;
	/**
	 * Defines the confidence of the match, from 0 to 1.
	 */
	score: number;
	/**
	 * Defines whether or not the animation group must be updated (or added).
	 */
	update: boolean;
}

/**
 * Defines the result of the analysis of the edited hierarchy against the asset: the copies of the asset found in the scene
 * and the matches of their nodes and animation groups.
 */
export interface IUpdateResourcesAnalysis {
	/**
	 * Defines the absolute path of the asset file.
	 */
	filename: string;
	/**
	 * Defines the reference to the container of the loaded asset.
	 */
	container: AssetContainer;
	/**
	 * Defines the list of the copies of the asset found in the edited hierarchy.
	 */
	copies: IUpdateResourcesCopy[];
	/**
	 * Defines the list of the nodes of the edited hierarchy with their match.
	 */
	nodes: IUpdateResourcesNodeItem[];
	/**
	 * Defines the list of the animation groups of the copies with their match.
	 */
	animationGroups: IUpdateResourcesAnimationGroupItem[];
	/**
	 * Defines the list of all the nodes of the asset (meshes, instances and transform nodes).
	 */
	assetNodes: TransformNode[];
	/**
	 * Defines the list of the nodes of the asset that have a geometry (meshes and instances).
	 */
	assetMeshes: TransformNode[];
	/**
	 * Defines whether or not the materials of the updated meshes must be replaced by the materials of the asset.
	 */
	updateMaterials: boolean;
	/**
	 * Defines the LOD meshes of the scene, not found in the LODs of the asset, that must be removed with their LOD level.
	 */
	removedLodMeshes: Set<Mesh>;
}

/**
 * Defines what was done when updating the resources.
 */
export interface IUpdateResourcesReport {
	/**
	 * Defines the number of meshes whose geometry was updated.
	 */
	geometries: number;
	/**
	 * Defines the number of skeletons created from the asset.
	 */
	skeletons: number;
	/**
	 * Defines the number of morph target managers created from the asset.
	 */
	morphTargetManagers: number;
	/**
	 * Defines the number of meshes whose material was replaced by the material of the asset.
	 */
	materials: number;
	/**
	 * Defines the number of LOD levels updated or added from the asset.
	 */
	lods: number;
	/**
	 * Defines the number of LOD levels removed because they were not found in the asset.
	 */
	removedLods: number;
	/**
	 * Defines the number of nodes whose transform was updated.
	 */
	transforms: number;
	/**
	 * Defines the number of nodes created because they didn't exist in the scene (joints added to a skeleton).
	 */
	createdNodes: number;
	/**
	 * Defines the number of animation groups of the scene that were updated.
	 */
	updatedAnimationGroups: number;
	/**
	 * Defines the number of animation groups added to the scene.
	 */
	addedAnimationGroups: number;
	/**
	 * Defines the number of nodes removed because they were not found in the asset (see getNodesToRemove).
	 */
	removedNodes: number;
	/**
	 * Defines the list of the problems met during the update.
	 */
	warnings: string[];
}
