import { Scene, Mesh, Node } from "babylonjs";

import { isMesh, isAbstractMesh } from "../../tools/guards/nodes";

import {
	addBoxMesh,
	addPlaneMesh,
	addGroundMesh,
	addSphereMesh,
	addCapsuleMesh,
	addTorusMesh,
	addTorusKnotMesh,
	addCylinderMesh,
	addSkyboxMesh,
	addEmptyMesh,
} from "../../project/add/mesh";

import { IMCPActionOptions } from "../action";
import { resolveNode, resolveMaterial, toNodeSummary, toVector3 } from "../tools/resolve";

/**
 * Resolves an optional parent node from the given data.
 */
function resolveOptionalParent(scene: Scene, data: any): Node | undefined {
	if (data.parentId || data.parentName) {
		return resolveNode({ scene, nodeId: data.parentId, nodeName: data.parentName });
	}

	return undefined;
}

/**
 * Creates a primitive mesh in the scene reusing the editor's "add" functions.
 */
export function createPrimitiveMesh(scene: Scene, data: any, options: IMCPActionOptions): any {
	const parent = resolveOptionalParent(scene, data);
	const editor = options.editor;

	let mesh: Node;
	switch (data.type) {
		case "box":
			mesh = addBoxMesh(editor, parent);
			break;
		case "sphere":
			mesh = addSphereMesh(editor, parent);
			break;
		case "ground":
			mesh = addGroundMesh(editor, parent);
			break;
		case "plane":
			mesh = addPlaneMesh(editor, parent);
			break;
		case "cylinder":
			mesh = addCylinderMesh(editor, parent);
			break;
		case "capsule":
			mesh = addCapsuleMesh(editor, parent);
			break;
		case "torus":
			mesh = addTorusMesh(editor, parent);
			break;
		case "torusknot":
			mesh = addTorusKnotMesh(editor, parent);
			break;
		case "skybox":
			mesh = addSkyboxMesh(editor, parent);
			break;
		case "empty":
			mesh = addEmptyMesh(editor, parent);
			break;
		default:
			throw new Error(`Unknown primitive mesh type: ${data.type}`);
	}

	if (data.name) {
		mesh.name = data.name;
	}

	if (data.position && isAbstractMesh(mesh)) {
		mesh.position.copyFrom(toVector3(data.position));
	}

	return toNodeSummary(mesh);
}

/**
 * Creates one or more InstancedMesh from a source mesh.
 */
export function createInstance(scene: Scene, data: any, options: IMCPActionOptions): any {
	const source = resolveNode({ scene, nodeId: data.sourceNodeId, nodeName: data.sourceNodeName });

	if (!isMesh(source)) {
		throw new Error(`Source node "${source.name}" is not a Mesh and cannot be instanced.`);
	}

	const sourceMesh = source as Mesh;
	const parent = resolveOptionalParent(scene, data);

	const transforms: any[] = data.transforms ?? [];
	const count = data.count ?? transforms.length ?? 1;
	const total = Math.max(count, transforms.length, 1);

	const baseName = data.name ?? `${sourceMesh.name} (Instance)`;
	const instances: any[] = [];

	for (let i = 0; i < total; ++i) {
		const instance = sourceMesh.createInstance(total > 1 ? `${baseName} ${i}` : baseName);
		instance.parent = parent ?? null;

		const transform = transforms[i];
		if (transform) {
			if (transform.position) {
				instance.position.copyFrom(toVector3(transform.position));
			}
			if (transform.rotation) {
				instance.rotation.copyFrom(toVector3(transform.rotation));
			}
			if (transform.scaling) {
				instance.scaling.copyFrom(toVector3(transform.scaling));
			}
		}

		instances.push(instance);
	}

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(instances[instances.length - 1]);
	});
	options.editor.layout.inspector.setEditedObject(instances[instances.length - 1]);

	return { instances: instances.map((instance) => toNodeSummary(instance)) };
}

/**
 * Clones a mesh. When `cloneGeometry` is false (default), the geometry is shared with the source.
 */
export function cloneMesh(scene: Scene, data: any, options: IMCPActionOptions): any {
	const source = resolveNode({ scene, nodeId: data.sourceNodeId, nodeName: data.sourceNodeName });

	if (!isMesh(source)) {
		throw new Error(`Source node "${source.name}" is not a Mesh and cannot be cloned.`);
	}

	const sourceMesh = source as Mesh;
	const cloneGeometry = data.cloneGeometry ?? false;

	// Mesh.clone shares the source geometry by reference (no duplication).
	const clone = sourceMesh.clone(data.name ?? `${sourceMesh.name} (Clone)`, sourceMesh.parent, true);

	// Only duplicate the geometry when explicitly requested.
	if (cloneGeometry) {
		clone.makeGeometryUnique();
	}

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(clone);
	});
	options.editor.layout.inspector.setEditedObject(clone);

	return toNodeSummary(clone);
}

/**
 * Assigns an existing material to a mesh.
 */
export function setMeshMaterial(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isAbstractMesh(node)) {
		throw new Error(`Node "${node.name}" is not a mesh.`);
	}

	const material = resolveMaterial({ scene, materialId: data.materialId });
	node.material = material;

	options.editor.layout.graph.setSelectedNode(node);
	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}

/**
 * Toggles the visibility/enabled state of a mesh.
 */
export function setMeshVisibility(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isAbstractMesh(node)) {
		throw new Error(`Node "${node.name}" is not a mesh.`);
	}

	if (data.isVisible !== undefined) {
		node.isVisible = data.isVisible;
	}

	if (data.isEnabled !== undefined) {
		node.setEnabled(data.isEnabled);
	}

	if (data.visibility !== undefined) {
		node.visibility = data.visibility;
	}

	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}
