import { Node, Quaternion, Tools, TransformNode } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";

import { createNameInfo } from "../match/names";
import { isMatchableNode } from "../match/nodes";

import { UpdateResourcesContext, UpdateResourcesCopyKey } from "./context";

/**
 * Copies the transform (position, rotation and scaling) of the given node of the asset to the given node of the scene. The
 * rotation is copied as a quaternion when the node of the scene uses a quaternion, as euler angles otherwise.
 * @param source defines the reference to the node of the asset to copy the transform from.
 * @param target defines the reference to the node of the scene to copy the transform to.
 */
export function copyTransform(source: TransformNode, target: TransformNode): void {
	target.position.copyFrom(source.position);
	target.scaling.copyFrom(source.scaling);

	const rotation = source.rotationQuaternion ?? Quaternion.FromEulerVector(source.rotation);

	if (target.rotationQuaternion) {
		target.rotationQuaternion.copyFrom(rotation);
	} else {
		rotation.toEulerAnglesToRef(target.rotation);
	}
}

/**
 * Updates the given node of the scene so it is placed like the given node of the asset: the node is moved under the node of
 * the scene corresponding to the parent of the node of the asset (when the artist moved the node in the hierarchy), then its
 * transform is copied (see copyTransform). The parent is kept when the parent of the asset can't be found in the scene.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the node of the scene belongs to.
 * @param sceneNode defines the reference to the node of the scene to update.
 * @param assetNode defines the reference to the node of the asset to take the parent and the transform from.
 */
export function updateNodeTransform(context: UpdateResourcesContext, copy: UpdateResourcesCopyKey, sceneNode: TransformNode, assetNode: TransformNode): void {
	const sceneParent = assetNode.parent ? context.resolveNode(copy, assetNode.parent) : null;

	if (sceneParent && sceneParent !== sceneNode.parent && sceneParent !== sceneNode && !sceneParent.isDescendantOf(sceneNode)) {
		sceneNode.parent = sceneParent;
	}

	copyTransform(assetNode, sceneNode);
}

/**
 * Returns the node of the scene corresponding to the given node of the asset in the given copy, creating it when it doesn't
 * exist in the scene yet (a joint added to the skeleton by the artist, for example). Missing ancestors are created as well
 * as long as they belong to the part of the asset the copy corresponds to.
 * The created node is a transform node with the same name and transform as the node of the asset and new identifiers.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the node must belong to.
 * @param assetNode defines the reference to the node of the asset.
 * @param fallbackParent defines the parent of the created node when its parent can't be found in the scene.
 */
export function getOrCreateSceneNode(context: UpdateResourcesContext, copy: UpdateResourcesCopyKey, assetNode: TransformNode, fallbackParent: Node | null): TransformNode {
	const existingNode = context.resolveNode(copy, assetNode);
	if (existingNode) {
		return existingNode;
	}

	const node = new TransformNode(assetNode.name, context.scene);
	node.id = Tools.RandomId();
	node.uniqueId = UniqueNumber.Get();
	node.parent = getSceneParent(context, copy, assetNode, fallbackParent);

	if (assetNode.rotationQuaternion) {
		node.rotationQuaternion = Quaternion.Identity();
	}

	copyTransform(assetNode, node);

	context.registerNode(copy, assetNode, node);
	++context.report.createdNodes;

	return node;
}

/**
 * Registers the ancestors of the given nodes as corresponding nodes, as long as they have the same name. Used to find the
 * nodes containing the joints (like the "Armature" node) from the matched joints, so the joints added to the skeleton are
 * created at the right place.
 * @param context defines the context of the update.
 * @param copy defines the copy of the asset the node of the scene belongs to.
 * @param assetNode defines the reference to the node of the asset.
 * @param sceneNode defines the reference to the node of the scene corresponding to the node of the asset.
 */
export function registerMatchingAncestors(context: UpdateResourcesContext, copy: UpdateResourcesCopyKey, assetNode: Node, sceneNode: Node): void {
	let assetParent = assetNode.parent;
	let sceneParent = sceneNode.parent;

	while (assetParent && sceneParent && isMatchableNode(sceneParent) && !context.hasNode(copy, assetParent)) {
		if (createNameInfo(assetParent.name).normalized !== createNameInfo(sceneParent.name).normalized) {
			break;
		}

		context.registerNode(copy, assetParent, sceneParent);

		assetParent = assetParent.parent;
		sceneParent = sceneParent.parent;
	}
}

/**
 * Returns the node of the scene to use as parent for the node created from the given node of the asset.
 */
function getSceneParent(context: UpdateResourcesContext, copy: UpdateResourcesCopyKey, assetNode: TransformNode, fallbackParent: Node | null): Node | null {
	const assetParent = assetNode.parent;
	if (!assetParent) {
		return fallbackParent;
	}

	const sceneParent = context.resolveNode(copy, assetParent);
	if (sceneParent) {
		return sceneParent;
	}

	if (copy && isMatchableNode(assetParent) && assetParent.isDescendantOf(copy.assetRoot)) {
		return getOrCreateSceneNode(context, copy, assetParent, fallbackParent);
	}

	return fallbackParent;
}
