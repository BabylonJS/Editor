import { Scene, TransformNode, AbstractMesh } from "babylonjs";

import { isLight, isClusteredLightContainer, isAbstractMesh, isAnyTransformNode } from "../../tools/guards/nodes";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toVector3, deepSet } from "../tools/resolve";

/**
 * Returns the full details of a node.
 */
export function getNode(scene: Scene, data: any): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	const result: any = {
		id: node.id,
		name: node.name,
		className: node.getClassName(),
		isEnabled: node.isEnabled(false),
		parentId: node.parent?.id ?? null,
		metadata: node.metadata ?? null,
	};

	if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		const transform = node as unknown as TransformNode;
		result.position = [transform.position.x, transform.position.y, transform.position.z];
		result.rotation = [transform.rotation.x, transform.rotation.y, transform.rotation.z];
		result.scaling = [transform.scaling.x, transform.scaling.y, transform.scaling.z];

		if (transform.rotationQuaternion) {
			result.rotationQuaternion = [transform.rotationQuaternion.x, transform.rotationQuaternion.y, transform.rotationQuaternion.z, transform.rotationQuaternion.w];
		}
	}

	if (isAbstractMesh(node)) {
		const mesh = node as AbstractMesh;
		result.isVisible = mesh.isVisible;
		result.materialId = mesh.material?.id ?? null;
	}

	return result;
}

/**
 * Sets the transform (position/rotation/scaling) of a node.
 */
export function setNodeTransform(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isAbstractMesh(node) && !isAnyTransformNode(node)) {
		throw new Error(`Node "${node.name}" does not support transforms.`);
	}

	const transform = node as unknown as TransformNode;

	if (data.position) {
		transform.position.copyFrom(toVector3(data.position));
	}

	if (data.rotation) {
		if (transform.rotationQuaternion) {
			transform.rotationQuaternion = null;
		}
		transform.rotation.copyFrom(toVector3(data.rotation));
	}

	if (data.scaling) {
		transform.scaling.copyFrom(toVector3(data.scaling));
	}

	options.editor.layout.graph.setSelectedNode(node);
	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Sets generic deep properties on a node using dotted property paths.
 */
export function setNodeProperties(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	const properties = data.properties ?? {};
	for (const path of Object.keys(properties)) {
		deepSet(node, path, properties[path]);
	}

	options.editor.layout.graph.setSelectedNode(node);
	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Reparents a node, preserving its world transform by default.
 * When reparenting a non-shadow light into a ClusteredLightContainer, uses `addLight`.
 */
export function setNodeParent(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	let parent: any = null;
	if (data.parentId || data.parentName) {
		parent = resolveNode({ scene, nodeId: data.parentId, nodeName: data.parentName });
	}

	const preserveWorldTransform = data.preserveWorldTransform ?? true;

	if (parent && isClusteredLightContainer(parent) && isLight(node)) {
		parent.addLight(node);
	} else if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		const transform = node as unknown as TransformNode;
		if (preserveWorldTransform) {
			transform.setParent(parent);
		} else {
			transform.parent = parent;
		}
	} else {
		node.parent = parent;
	}

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(node);
	});
	options.editor.layout.inspector.setEditedObject(node);

	return toNodeSummary(node);
}

/**
 * Renames a node.
 */
export function renameNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	node.name = data.newName;

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(node);
	});
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Removes a node (and its descendants) from the scene.
 */
export function deleteNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	node.dispose(false, false);

	options.editor.layout.graph.refresh();
	options.editor.layout.inspector.setEditedObject(null);

	return { deleted: true };
}

/**
 * Selects/focuses a node in the editor (UX only).
 */
export function selectNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	options.editor.layout.graph.setSelectedNode(node);
	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.preview.gizmo.setAttachedObject(node);

	return { selected: true };
}
