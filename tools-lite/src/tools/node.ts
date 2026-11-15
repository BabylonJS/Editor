import {
	addToScene,
	Camera,
	cloneTransformNode,
	invalidateRenderBundles,
	LightBase,
	Mesh,
	removeFromScene,
	SceneContext,
	SceneNode,
	setLightIntensity,
	setMeshVisible,
} from "@babylonjs/lite";

import { Observable } from "./observable";
import { isAbstractMesh, isCamera, isLight } from "./guards";
import { getNodeScene, getSceneData } from "./scene";

const enabledStates = new WeakMap<object, boolean>();
const visibleStates = new WeakMap<object, boolean>();
const lodHiddenNodes = new WeakSet<object>();
const lightsIntensities = new WeakMap<object, number>();

const disposedNodes = new WeakSet<object>();
const disposeObservables = new WeakMap<object, Observable<any>>();

const nodesCameras = new WeakMap<object, Camera[]>();

/**
 * @internal
 * Adds the given node to the scene without its descendants. The `addToScene` function of Babylon Lite also adds the
 * descendants of the node (the lights would be added twice, the cameras would become the active camera, etc.)
 * while the tools add each node of the editor scenes only once.
 */
export function _addNodeToScene(scene: SceneContext, node: Mesh | LightBase): void {
	const children = node.children;
	node.children = [];

	try {
		addToScene(scene, node);
	} finally {
		node.children = children;
	}
}

/**
 * @internal
 * Removes the given node from the scene without its descendants (see `_addNodeToScene`).
 * A mesh removed from its last scene is disposed by Babylon Lite.
 */
export function _removeNodeFromScene(scene: SceneContext, node: Mesh | LightBase | Camera): void {
	const children = node.children;
	node.children = [];

	try {
		removeFromScene(scene, node);
	} finally {
		node.children = children;
	}
}

/**
 * @internal
 * Clones the given node without its descendants: `cloneTransformNode` of Babylon Lite clones the whole hierarchy.
 * The clones of the meshes share the geometry (GPU buffers) and the material of the source mesh.
 */
export function _cloneNodeWithoutChildren<T extends SceneNode>(node: T): T {
	const children = node.children;
	node.children = [];

	try {
		return cloneTransformNode(node) as T;
	} finally {
		node.children = children;
	}
}

/**
 * @internal
 * Sets the parent of the given camera. The cameras of Babylon Lite are not scene nodes: they are not added to the
 * children of their parent (the functions of Babylon Lite traversing the children, like `addToScene`, would handle
 * them as nodes). The tools keep track of them to return them as descendants of their parent, like Babylon.js does.
 */
export function _setCameraParent(camera: Camera, parent: SceneNode | Camera | null): void {
	const cameraWithParent = camera as Camera & { parent: SceneNode | Camera | null };

	const previousParent = cameraWithParent.parent;
	if (previousParent) {
		const cameras = nodesCameras.get(previousParent);
		const index = cameras?.indexOf(camera) ?? -1;
		if (index !== -1) {
			cameras!.splice(index, 1);
		}
	}

	cameraWithParent.parent = parent as any;

	if (parent) {
		let cameras = nodesCameras.get(parent);
		if (!cameras) {
			cameras = [];
			nodesCameras.set(parent, cameras);
		}

		cameras.push(camera);
	}
}

/**
 * Returns the list of cameras having the given node as parent.
 * @param node defines the reference to the parent node.
 */
export function getNodeCameras(node: object): Camera[] {
	return nodesCameras.get(node) ?? [];
}

/**
 * Returns wether or not the given node is a descendant of a transform node set as static group.
 * @param node defines the reference to the node to check the ancestors.
 */
export function isNodeFromStaticGroup(node: SceneNode | Camera): boolean {
	let parent: any = node;

	while (parent) {
		if (parent.metadata?.isStaticGroup) {
			return true;
		}

		parent = parent.parent;
	}

	return false;
}

/**
 * Returns the parent node of the given node, if any.
 * @param node defines the reference to the node to get its parent.
 */
export function getNodeParent(node: SceneNode | Camera): SceneNode | null {
	return ((node as SceneNode).parent as SceneNode) ?? null;
}

/**
 * Returns the list of descendants of the given node.
 * @param node defines the reference to the node to get its descendants.
 * @param directDescendantsOnly defines if true only direct descendants of the node will be considered.
 * @param predicate defines an optional predicate that will be called on every evaluated child, the predicate must return true for a given child to be part of the result.
 */
export function getNodeDescendants(node: SceneNode | Camera, directDescendantsOnly: boolean = false, predicate?: (node: SceneNode | Camera) => boolean): (SceneNode | Camera)[] {
	const result: (SceneNode | Camera)[] = [];

	function traverse(current: SceneNode | Camera) {
		for (const child of [...(current.children ?? []), ...getNodeCameras(current)]) {
			if (_isInternalNode(child)) {
				continue;
			}

			if (!predicate || predicate(child)) {
				result.push(child);
			}

			if (!directDescendantsOnly) {
				traverse(child);
			}
		}
	}

	traverse(node);

	return result;
}

const internalNodes = new WeakSet<object>();
const subMeshNodes = new WeakSet<object>();

/**
 * @internal
 * Marks the given mesh as one of the extra meshes created for the sub-meshes of a mesh using a multi-material: it
 * is internal to the tools and follows the visibility of its parent.
 */
export function _markNodeAsSubMesh(node: object): void {
	internalNodes.add(node);
	subMeshNodes.add(node);
}

/**
 * @internal
 * Marks the given node as internal to the tools (ie. the extra meshes created for the sub-meshes of a mesh),
 * so it is not returned when getting the descendants of a node.
 */
export function _markNodeAsInternal(node: object): void {
	internalNodes.add(node);
}

/**
 * @internal
 */
export function _isInternalNode(node: object): boolean {
	return internalNodes.has(node);
}

/**
 * @internal
 */
export function _isSubMeshNode(node: object): boolean {
	return subMeshNodes.has(node);
}

/**
 * @internal
 * Copies the enabled and visible states of the given source node to the given target node, typically a clone. The
 * states are applied to the Babylon Lite objects by `_refreshNodeVisibility`.
 */
export function _copyNodeStates(source: object, target: object): void {
	if (enabledStates.has(source)) {
		enabledStates.set(target, enabledStates.get(source)!);
	}

	if (visibleStates.has(source)) {
		visibleStates.set(target, visibleStates.get(source)!);
	}

	if (internalNodes.has(source)) {
		internalNodes.add(target);
	}

	if (subMeshNodes.has(source)) {
		subMeshNodes.add(target);
	}

	// The intensity of a disabled light is 0 until it is enabled again.
	if (lightsIntensities.has(source)) {
		lightsIntensities.set(target, lightsIntensities.get(source)!);
	}
}

/**
 * Returns wether or not the given node is enabled.
 * @param node defines the reference to the node to check.
 * @param checkAncestors defines wether or not the ancestors of the node must be checked as well (default true).
 */
export function isNodeEnabled(node: SceneNode | Camera, checkAncestors: boolean = true): boolean {
	if (enabledStates.get(node) === false) {
		return false;
	}

	if (!checkAncestors) {
		return true;
	}

	const parent = (node as SceneNode).parent as SceneNode | null;
	return parent ? isNodeEnabled(parent, true) : true;
}

/**
 * Sets wether or not the given node is enabled. A disabled node and all its descendants are not rendered anymore,
 * a disabled light does not light the scene anymore.
 * @param node defines the reference to the node to enable or disable.
 * @param enabled defines wether or not the node is enabled.
 */
export function setNodeEnabled(node: SceneNode | Camera, enabled: boolean): void {
	if (isNodeEnabled(node, false) === enabled) {
		return;
	}

	enabledStates.set(node, enabled);
	_refreshNodeVisibility(node);
}

/**
 * Returns wether or not the given mesh is visible as configured in the editor (Babylon.js `isVisible`).
 * @param mesh defines the reference to the mesh to check.
 */
export function isMeshVisible(mesh: SceneNode): boolean {
	return visibleStates.get(mesh) ?? true;
}

/**
 * Sets wether or not the given mesh is visible (Babylon.js `isVisible`). Unlike `setNodeEnabled`, the descendants
 * of the mesh are not affected.
 * @param mesh defines the reference to the mesh to show or hide.
 * @param visible defines wether or not the mesh is visible.
 */
export function setMeshVisibleState(mesh: SceneNode, visible: boolean): void {
	if (isMeshVisible(mesh) === visible) {
		return;
	}

	visibleStates.set(mesh, visible);
	_refreshNodeVisibility(mesh);
}

/**
 * @internal
 * Sets wether or not the given mesh is hidden because another level of detail is displayed instead.
 */
export function _setNodeHiddenByLod(node: object, hidden: boolean): void {
	if (hidden) {
		lodHiddenNodes.add(node);
	} else {
		lodHiddenNodes.delete(node);
	}
}

/**
 * Returns wether or not the given mesh is hidden because another level of detail is displayed instead.
 * @param node defines the reference to the mesh.
 */
export function isNodeHiddenByLod(node: object): boolean {
	return lodHiddenNodes.has(node);
}

function getEffectiveVisibility(node: SceneNode | Camera, enabled: boolean): boolean {
	if (!isAbstractMesh(node)) {
		return enabled;
	}

	// The meshes created for the sub-meshes of a mesh are displayed with it.
	if (subMeshNodes.has(node)) {
		const parent = (node as SceneNode).parent as SceneNode | null;
		return enabled && (parent ? getEffectiveVisibility(parent, enabled) : true);
	}

	return enabled && isMeshVisible(node) && !lodHiddenNodes.has(node);
}

/**
 * @internal
 * Applies the enabled and visible states of the given node, and of its descendants, to the Babylon Lite objects:
 * the `visible` flag of the nodes and the intensity of the lights.
 */
export function _refreshNodeVisibility(node: SceneNode | Camera): void {
	let changed = false;

	function apply(current: SceneNode | Camera, parentEnabled: boolean) {
		const enabled = parentEnabled && enabledStates.get(current) !== false;

		if (isLight(current)) {
			_applyLightEnabled(current, enabled);
		} else if (!isCamera(current)) {
			const visible = getEffectiveVisibility(current, enabled);
			if ((current as SceneNode).visible !== visible) {
				(current as SceneNode).visible = visible;
				changed = true;
			}
		}

		for (const child of current.children ?? []) {
			apply(child, enabled);
		}

		for (const camera of getNodeCameras(current)) {
			apply(camera, enabled);
		}
	}

	const parent = (node as SceneNode).parent as SceneNode | null;
	apply(node, parent ? isNodeEnabled(parent, true) : true);

	if (!changed) {
		return;
	}

	// A bare "visible" write doesn't invalidate the cached render bundles of Babylon Lite.
	const scene = getNodeScene(node);
	if (scene) {
		invalidateRenderBundles(scene.surface.engine);
	} else if (!isCamera(node)) {
		const visible = (node as SceneNode).visible !== false;
		const descendants = getNodeDescendants(node).filter((descendant) => !isCamera(descendant)) as SceneNode[];
		const states = descendants.map((descendant) => descendant.visible);

		setMeshVisible(node as SceneNode, !visible);
		setMeshVisible(node as SceneNode, visible);

		descendants.forEach((descendant, index) => (descendant.visible = states[index]));
	}
}

function _applyLightEnabled(light: LightBase & { intensity?: number }, enabled: boolean) {
	if (light.intensity === undefined) {
		return;
	}

	if (!enabled) {
		if (!lightsIntensities.has(light)) {
			lightsIntensities.set(light, light.intensity);
			setLightIntensity(light as LightBase & { intensity: number }, 0);
		}
	} else if (lightsIntensities.has(light)) {
		setLightIntensity(light as LightBase & { intensity: number }, lightsIntensities.get(light)!);
		lightsIntensities.delete(light);
	}
}

/**
 * Returns the intensity of the given light, even if the light is disabled.
 * @param light defines the reference to the light to get its intensity.
 */
export function getLightIntensity(light: LightBase & { intensity: number }): number {
	return lightsIntensities.get(light) ?? light.intensity;
}

/**
 * Returns the observable notified when the given object is disposed using `disposeNode`.
 * @param object defines the reference to the object (node, sound node, sprite, etc.).
 */
export function getOnDisposeObservable<T extends object>(object: T): Observable<T> {
	let observable = disposeObservables.get(object);
	if (!observable) {
		observable = new Observable<T>();
		disposeObservables.set(object, observable);
	}

	return observable;
}

/**
 * Returns wether or not the given node has been disposed using `disposeNode`.
 * @param node defines the reference to the node to check.
 */
export function isNodeDisposed(node: object): boolean {
	return disposedNodes.has(node);
}

/**
 * @internal
 * Notifies the dispose observers of the given object and marks it as disposed.
 */
export function _notifyObjectDisposed(object: object): void {
	if (disposedNodes.has(object)) {
		return;
	}

	disposedNodes.add(object);

	const observable = disposeObservables.get(object);
	observable?.notifyObservers(object);
	observable?.clear();

	disposeObservables.delete(object);
}

/**
 * Disposes the given node and its descendants (unless `doNotRecurse` is true): the scripts attached to them are
 * stopped, the meshes and lights are removed from the scene (the GPU resources of the meshes are released when
 * they are not shared anymore) and the nodes are removed from the lists of the tools.
 * @param scene defines the reference to the scene the node belongs to.
 * @param node defines the reference to the node to dispose.
 * @param doNotRecurse defines wether or not the descendants of the node should be kept.
 */
export function disposeNode(scene: SceneContext, node: SceneNode | Camera, doNotRecurse: boolean = false): void {
	if (disposedNodes.has(node)) {
		return;
	}

	for (const child of [...(node.children ?? []), ...getNodeCameras(node)]) {
		if (!doNotRecurse || _isInternalNode(child)) {
			disposeNode(scene, child);
		} else if (isCamera(child)) {
			_setCameraParent(child, null);
		} else {
			// Same as Babylon.js: the descendants that are kept are detached from the disposed node.
			(child as SceneNode).parent = null;
			removeFromArray(node.children, child);
		}
	}

	_notifyObjectDisposed(node);

	const data = getSceneData(scene);

	removeFromArray(data.transformNodes, node);
	removeFromArray(data.meshes, node);
	removeFromArray(data.lights, node);
	removeFromArray(data.cameras, node);

	if (isCamera(node)) {
		_setCameraParent(node, null);
	} else {
		const parent = (node as SceneNode).parent as SceneNode | null;
		if (parent?.children) {
			removeFromArray(parent.children, node);
		}
	}

	if (isAbstractMesh(node) || isLight(node) || isCamera(node)) {
		_removeNodeFromScene(scene, node as Mesh | LightBase | Camera);
	}
}

function removeFromArray(array: any[], item: any): void {
	const index = array.indexOf(item);
	if (index !== -1) {
		array.splice(index, 1);
	}
}
