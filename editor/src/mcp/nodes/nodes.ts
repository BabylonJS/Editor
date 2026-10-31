import { Scene, Node, AbstractMesh, Camera, Light, ClusteredLightContainer } from "babylonjs";

import { unique } from "../../tools/tools";
import { cloneNode } from "../../tools/node/clone";
import { registerUndoRedo } from "../../tools/undoredo";
import { ensureNodeMetadata } from "../../tools/node/metadata";
import { isClusteredLight } from "../../tools/light/cluster";
import { isAnyParticleSystem } from "../../tools/guards/particles";
import { isScene, isSceneLinkNode } from "../../tools/guards/scene";
import { isSprite, isSpriteMapNode } from "../../tools/guards/sprites";
import { isLight, isCamera, isClusteredLightContainer, isAbstractMesh, isInstancedMesh, isNode } from "../../tools/guards/nodes";

import { removeObjects } from "../../editor/layout/graph/remove";
import { setNewParentForObjects } from "../../editor/layout/graph/move";

import { Editor } from "../../editor/main";

import { IMCPActionOptions } from "../action";
import {
	GraphObject,
	getGraphObjectId,
	resolveEditableGraphObject,
	resolveGraphObject,
	resolveNode,
	toGraphObjectSummary,
	toNodeSummary,
	toVector3,
	deepSet,
} from "../tools/resolve";

/**
 * Throws while the game plays: the graph shows the game, and the undo/redo stack that applies the changes of the graph is disabled.
 */
function assertNotPlaying(editor: Editor): void {
	const play = editor.layout.preview.play;
	if (play.scene || play.state.playing) {
		throw new Error("The game is playing: call `stop_scene` before changing the hierarchy of the scene.");
	}
}

/**
 * Resolves the objects of the graph targeted by a tool: the ones listed in `nodeIds`, or the one of `nodeId`/`nodeName`.
 */
function resolveTargets(scene: Scene, data: any): GraphObject[] {
	if (data.nodeIds?.length) {
		return unique(data.nodeIds.map((nodeId: string) => resolveEditableGraphObject({ scene, nodeId })));
	}

	return [resolveEditableGraphObject({ scene, nodeId: data.nodeId, nodeName: data.nodeName })];
}

/**
 * Returns the full details of a node, including transform, camera and light specific properties.
 * The other objects of the graph (particle systems, sprites, skeletons and GUI) only have a summary.
 */
export function getNode(scene: Scene, data: any): any {
	const node = resolveGraphObject({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!(node instanceof Node)) {
		return toGraphObjectSummary(node);
	}

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

	ensureNodeMetadata(node);

	const properties = data.properties ?? {};
	for (const path of Object.keys(properties)) {
		deepSet(node, path, properties[path]);
	}

	// The graph shows them: the name, the icon of the enabled state, the lock and the "do not serialize" state.
	if (Object.keys(properties).some((path) => path === "name" || path === "isEnabled" || path.startsWith("metadata."))) {
		options.editor.layout.graph.refresh().then(() => {
			options.editor.layout.graph.setSelectedNode(node);
		});
	} else {
		options.editor.layout.graph.setSelectedNode(node);
	}

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Throws for the moves the graph silently ignores, and the ones that would break the scene: a node that becomes
 * its own ancestor stops the rendering of the editor.
 */
function assertCanMove(object: GraphObject, parent: GraphObject | Scene): void {
	if (isAnyParticleSystem(object)) {
		if (!isAbstractMesh(parent)) {
			throw new Error(`Particle system "${object.name}" can only be moved to a mesh, which becomes its emitter.`);
		}

		return;
	}

	if (!isNode(object)) {
		throw new Error(`"${object.name}" can't be moved in the graph.`);
	}

	if (isScene(parent)) {
		return;
	}

	if (!(parent instanceof Node)) {
		throw new Error(`"${parent.name}" can't have children.`);
	}

	if (object === parent || parent.isDescendantOf(object)) {
		throw new Error(`"${object.name}" can't be moved under itself or one of its descendants ("${parent.name}").`);
	}

	if (isSceneLinkNode(parent)) {
		throw new Error(`"${parent.name}" is a scene link: the graph doesn't show the children of scene links.`);
	}

	if (isClusteredLightContainer(parent) && !(isLight(object) && ClusteredLightContainer.IsLightSupported(object))) {
		throw new Error(`"${object.name}" can't be moved to the clustered light container: it only accepts point and spot lights that don't cast shadows.`);
	}
}

/**
 * Returns wether or not the given object already is a child of the given parent in the graph.
 */
function isChildOf(object: GraphObject, parent: GraphObject | Scene, editor: Editor): boolean {
	if (isAnyParticleSystem(object)) {
		return object.emitter === parent;
	}

	if (isLight(object) && isClusteredLight(object, editor)) {
		return parent === editor.layout.preview.clusteredLightContainer;
	}

	return (object as Node).parent === (isScene(parent) ? null : parent);
}

/**
 * Moves objects in the hierarchy like dragging them in the graph, keeping their world transform by default.
 * The move of all the objects is a single undo/redo step.
 */
export function setNodeParent(scene: Scene, data: any, options: IMCPActionOptions): any {
	const editor = options.editor;

	assertNotPlaying(editor);

	const objects = resolveTargets(scene, data);
	const parent = data.parentId || data.parentName ? resolveEditableGraphObject({ scene, nodeId: data.parentId, nodeName: data.parentName }) : scene;

	objects.forEach((object) => assertCanMove(object, parent));

	const objectsToMove = objects.filter((object) => !isChildOf(object, parent, editor));
	if (objectsToMove.length) {
		setNewParentForObjects(editor, objectsToMove, parent, data.preserveWorldTransform ?? true);
	}

	const lastObject = objects[objects.length - 1];

	editor.layout.graph.refresh().then(() => {
		editor.layout.graph.setSelectedNode(lastObject as Node);
	});
	editor.layout.inspector.setEditedObject(lastObject);

	return data.nodeIds?.length ? { nodes: objects.map((object) => toGraphObjectSummary(object)) } : toGraphObjectSummary(lastObject);
}

/**
 * Renames an object of the graph, like renaming it in the graph, as a single undo/redo step.
 */
export function renameNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	assertNotPlaying(options.editor);

	const object = resolveEditableGraphObject({ scene, nodeId: data.nodeId, nodeName: data.nodeName });
	const oldName = object.name;

	registerUndoRedo({
		executeRedo: true,
		undo: () => (object.name = oldName),
		redo: () => (object.name = data.newName),
	});

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(object as Node);
	});
	options.editor.layout.inspector.forceUpdate();

	return toGraphObjectSummary(object);
}

/**
 * Removes objects from the scene like the "Remove" action of the graph, with their descendants and what depends on
 * them (particle systems, skeletons, animations). The removal of all the objects is a single undo/redo step.
 */
export function deleteNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	assertNotPlaying(options.editor);

	const objects = resolveTargets(scene, data);

	const container = objects.find((object) => isClusteredLightContainer(object));
	if (container) {
		throw new Error(`"${container.name}" belongs to the editor and can't be removed. Remove its lights instead.`);
	}

	removeObjects(options.editor, objects);

	return { deleted: true };
}

/**
 * Clones an object of the graph with its children, like the "Clone" action of the graph, as a single undo/redo step.
 * Each clone has its own id, which the save of the scene relies on. Geometries and materials are shared by default.
 */
export function cloneGraphNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	const editor = options.editor;

	assertNotPlaying(editor);

	const object = resolveEditableGraphObject({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	// The graph shows the output plane of a sprite map as its node: cloning it means cloning the sprite map.
	const source = object instanceof Node && object.parent && isSpriteMapNode(object.parent) && object.parent.outputPlane === object ? object.parent : object;

	const createClone = () => {
		const result = cloneNode(editor, source as Node, {
			shareGeometry: !data.cloneGeometry,
			shareSkeleton: true,
			cloneMaterial: data.cloneMaterial ?? false,
			cloneThinInstances: true,
		});

		if (result instanceof Node) {
			// Mesh.clone ignores the parent given in its options, and uses the last parent it gave to a cloned child instead.
			result.parent = (source as Node).parent;

			// InstancedMesh.clone erases the instanced buffers of the new instance: selecting their source mesh would then throw.
			[result, ...result.getDescendants(false)].forEach((node) => {
				if (isInstancedMesh(node)) {
					node.instancedBuffers ??= {};
				}
			});
		}

		if (result && data.name) {
			result.name = data.name;
		}

		return result;
	};

	let clone = createClone();
	if (!clone) {
		throw new Error(`"${object.name}" can't be cloned.`);
	}

	registerUndoRedo({
		undo: () => {
			clone?.dispose(false, false);
			clone = null;
		},
		redo: () => {
			clone = createClone();
		},
	});

	const summary = toGraphObjectSummary(clone);

	editor.layout.graph.refresh().then(() => {
		if (clone) {
			editor.layout.graph.setSelectedNode(clone);
		}
	});
	editor.layout.inspector.setEditedObject(clone);

	return summary;
}

/**
 * Selects/focuses an object of the graph in the editor (UX only).
 */
export function selectNode(scene: Scene, data: any, options: IMCPActionOptions): any {
	const object = resolveGraphObject({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	options.editor.layout.graph.setSelectedNode(object as Node);
	options.editor.layout.inspector.setEditedObject(object);

	if (object instanceof Node || isSprite(object)) {
		options.editor.layout.preview.gizmo.setAttachedObject(object);
	}

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
				id: getGraphObjectId(nodeData),
				name: (nodeData as any).name ?? null,
				className: (nodeData as any).getClassName?.() ?? null,
			};
		});

	return {
		count: nodes.length,
		nodes,
	};
}
