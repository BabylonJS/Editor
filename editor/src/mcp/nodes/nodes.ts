import { Scene, Node, AbstractMesh, Camera, Light, TransformNode } from "babylonjs";

import { isLight, isCamera, isClusteredLightContainer, isAbstractMesh, isAnyTransformNode } from "../../tools/guards/nodes";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toVector3, deepSet } from "../tools/resolve";

/**
 * Returns the full details of a node, including transform, camera and light specific properties.
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

	// Transform-like properties read by duck-typing so they also cover cameras and lights.
	const anyNode = node as any;

	if (anyNode.position?.x !== undefined) {
		result.position = [anyNode.position.x, anyNode.position.y, anyNode.position.z];
	}
	if (anyNode.rotation?.x !== undefined) {
		result.rotation = [anyNode.rotation.x, anyNode.rotation.y, anyNode.rotation.z];
	}
	if (anyNode.scaling?.x !== undefined) {
		result.scaling = [anyNode.scaling.x, anyNode.scaling.y, anyNode.scaling.z];
	}
	if (anyNode.direction?.x !== undefined) {
		result.direction = [anyNode.direction.x, anyNode.direction.y, anyNode.direction.z];
	}
	if (anyNode.rotationQuaternion) {
		result.rotationQuaternion = [anyNode.rotationQuaternion.x, anyNode.rotationQuaternion.y, anyNode.rotationQuaternion.z, anyNode.rotationQuaternion.w];
	}

	if (isAbstractMesh(node)) {
		const mesh = node as AbstractMesh;
		result.isVisible = mesh.isVisible;
		result.materialId = mesh.material?.id ?? null;
	}

	if (isCamera(node)) {
		const camera = node as Camera;
		const target = (camera as any).getTarget?.();
		if (target) {
			result.target = [target.x, target.y, target.z];
		}
		result.fov = (camera as any).fov;
		result.minZ = camera.minZ;
		result.maxZ = camera.maxZ;
	}

	if (isLight(node)) {
		const light = node as Light;
		result.intensity = light.intensity;
		result.diffuse = [light.diffuse.r, light.diffuse.g, light.diffuse.b];
		if ((light as any).range !== undefined) {
			result.range = (light as any).range;
		}
		if ((light as any).angle !== undefined) {
			result.angle = (light as any).angle;
		}
	}

	return result;
}

/**
 * Sets the transform of a node. Supports meshes/transform nodes (position/rotation/scaling),
 * lights (position/direction) and cameras (position/rotation/target). Only the provided and
 * supported properties are applied.
 */
export function setNodeTransform(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	const anyNode = node as any;
	let applied = false;

	if (data.position && anyNode.position?.copyFrom) {
		anyNode.position.copyFrom(toVector3(data.position));
		applied = true;
	}

	if (data.rotation && anyNode.rotation?.copyFrom) {
		if (anyNode.rotationQuaternion) {
			anyNode.rotationQuaternion = null;
		}
		anyNode.rotation.copyFrom(toVector3(data.rotation));
		applied = true;
	}

	if (data.scaling && anyNode.scaling?.copyFrom) {
		anyNode.scaling.copyFrom(toVector3(data.scaling));
		applied = true;
	}

	if (data.direction && anyNode.direction?.copyFrom) {
		anyNode.direction.copyFrom(toVector3(data.direction));
		applied = true;
	}

	if (data.target && typeof anyNode.setTarget === "function") {
		anyNode.setTarget(toVector3(data.target));
		applied = true;
	}

	if (!applied) {
		throw new Error(`Node "${node.name}" does not support any of the provided transform properties (position, rotation, scaling, direction, target).`);
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

/**
 * Returns the nodes currently selected by the user in the editor's graph (scene tree).
 * Useful to act on "the selected node" requested by the user (e.g. instantiate it many times to build a forest).
 */
export function getSelectedNodes(_scene: Scene, _data: any, options: IMCPActionOptions): any {
	const selected = options.editor.layout.graph.getSelectedNodes();

	const nodes = selected
		.map((treeNode) => treeNode.nodeData)
		.filter((nodeData) => !!nodeData)
		.map((nodeData) => {
			if (nodeData instanceof Node) {
				return toNodeSummary(nodeData);
			}

			// Particle systems / sprites are selectable in the graph but are not scene-graph nodes.
			return {
				id: (nodeData as any).id ?? null,
				name: (nodeData as any).name ?? null,
				className: (nodeData as any).getClassName?.() ?? null,
			};
		});

	return {
		count: nodes.length,
		nodes,
	};
}
