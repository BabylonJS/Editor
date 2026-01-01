import { Node, Vector3, Quaternion, TransformNode } from "babylonjs";

import { isScene } from "../guards/scene";
import { isAbstractMesh, isAnyTransformNode, isDirectionalLight, isPointLight, isSpotLight } from "../guards/nodes";

export interface IOldNodeHierarchyConfiguration {
	parent: Node | null;
	position?: Vector3;
	rotation?: Vector3;
	scaling?: Vector3;
	rotationQuaternion?: Quaternion;
}

export function getNodeParentingConfiguration(node: Node) {
	return {
		parent: node.parent,
		position: node["position"]?.clone(),
		rotation: node["rotation"]?.clone(),
		scaling: node["scaling"]?.clone(),
		rotationQuaternion: node["rotationQuaternion"]?.clone(),
	} as IOldNodeHierarchyConfiguration;
}

export function applyNodeParentingConfiguration(node: Node, config: IOldNodeHierarchyConfiguration) {
	node.parent = config.parent;
	if (config.position) {
		node["position"]?.copyFrom(config.position);
	}
	if (config.rotation) {
		node["rotation"]?.copyFrom(config.rotation);
	}
	if (config.scaling) {
		node["scaling"]?.copyFrom(config.scaling);
	}
	if (config.rotationQuaternion) {
		node["rotationQuaternion"]?.copyFrom(config.rotationQuaternion);
	}
}

export function applyTransformNodeParentingConfiguration(node: Node, newParent: Node | null, tempTransfromNode: TransformNode) {
	tempTransfromNode.parent = node.parent;
	tempTransfromNode.position.setAll(0);
	tempTransfromNode.rotation.setAll(0);
	tempTransfromNode.scaling.setAll(1);
	tempTransfromNode.rotationQuaternion = null;

	if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		tempTransfromNode.position.copyFrom(node.position);
		tempTransfromNode.rotation.copyFrom(node.rotation);
		tempTransfromNode.scaling.copyFrom(node.scaling);
		tempTransfromNode.rotationQuaternion = node.rotationQuaternion?.clone() || null;
	}

	if (isPointLight(node) || isDirectionalLight(node) || isSpotLight(node)) {
		tempTransfromNode.position.copyFrom(node.position);
	}

	tempTransfromNode.computeWorldMatrix(true);

	const effectiveParent = isScene(newParent) ? null : newParent;
	tempTransfromNode.setParent(effectiveParent);

	node.parent = effectiveParent;

	if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		node.position.copyFrom(tempTransfromNode.position);
		node.rotation.copyFrom(tempTransfromNode.rotation);
		node.scaling.copyFrom(tempTransfromNode.scaling);
		if (node.rotationQuaternion) {
			node.rotationQuaternion.copyFrom(tempTransfromNode.rotationQuaternion!);
		}
	}

	if (isPointLight(node) || isDirectionalLight(node) || isSpotLight(node)) {
		node.position.copyFrom(tempTransfromNode.position);
	}
}
