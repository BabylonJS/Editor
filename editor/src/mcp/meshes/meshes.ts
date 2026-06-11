import { Scene, Mesh, Node, AbstractMesh, Vector3, PhysicsAggregate, PhysicsShape, PhysicsShapeType, PhysicsMotionType } from "babylonjs";

import { isMesh, isAbstractMesh, isInstancedMesh } from "../../tools/guards/nodes";

import { createMeshInstance } from "../../tools/mesh/instance";
import { getPhysicsShapeForMesh } from "../../tools/physics/shape";

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
 * Uses the editor's `createMeshInstance` helper so each instance gets a proper id/uniqueId, copied
 * transform/visibility/enabled state, and is correctly wired into collision meshes and shadow maps
 * (this is what the editor inspector relies on to display the instance's properties).
 * By default each instance shares the source mesh's parent so the scene hierarchy stays easy to read.
 */
export function createInstance(scene: Scene, data: any, options: IMCPActionOptions): any {
	const source = resolveNode({ scene, nodeId: data.sourceNodeId, nodeName: data.sourceNodeName });

	if (!isMesh(source)) {
		throw new Error(`Source node "${source.name}" is not a Mesh and cannot be instanced.`);
	}

	const sourceMesh = source as Mesh;
	const editor = options.editor;

	// An explicit parent overrides the default (the source mesh's own parent). `undefined` means "not provided".
	const explicitParent = data.parentId || data.parentName ? resolveOptionalParent(scene, data) : undefined;

	const transforms: any[] = data.transforms ?? [];
	const total = Math.max(data.count ?? transforms.length ?? 1, transforms.length, 1);

	const instances: any[] = [];

	for (let i = 0; i < total; ++i) {
		const instance = createMeshInstance(editor, sourceMesh);

		if (data.name) {
			instance.name = total > 1 ? `${data.name} ${i}` : data.name;
		}

		// Default to the source mesh's parent (set by createMeshInstance); honor an explicit parent if provided.
		if (explicitParent !== undefined) {
			instance.parent = explicitParent ?? null;
		}

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

const physicsShapeTypes: Record<string, PhysicsShapeType> = {
	box: PhysicsShapeType.BOX,
	sphere: PhysicsShapeType.SPHERE,
	capsule: PhysicsShapeType.CAPSULE,
	cylinder: PhysicsShapeType.CYLINDER,
	mesh: PhysicsShapeType.MESH,
};

const physicsMotionTypes: Record<string, PhysicsMotionType> = {
	static: PhysicsMotionType.STATIC,
	dynamic: PhysicsMotionType.DYNAMIC,
	animated: PhysicsMotionType.ANIMATED,
};

/**
 * Returns a plain description of the physics setup currently attached to the given mesh.
 */
function describePhysics(mesh: AbstractMesh): any {
	const aggregate = mesh.physicsAggregate;
	if (!aggregate) {
		return null;
	}

	const massProperties = aggregate.body.getMassProperties();
	const shapeTypeName = Object.keys(physicsShapeTypes).find((key) => physicsShapeTypes[key] === aggregate.shape.type) ?? aggregate.shape.type;
	const motionTypeName = Object.keys(physicsMotionTypes).find((key) => physicsMotionTypes[key] === aggregate.body.getMotionType()) ?? aggregate.body.getMotionType();

	return {
		shapeType: shapeTypeName,
		motionType: motionTypeName,
		mass: massProperties.mass ?? 0,
		friction: aggregate.shape.material?.friction ?? null,
		restitution: aggregate.shape.material?.restitution ?? null,
	};
}

/**
 * Enables, disables and configures the Havok physics body of a mesh (mass, motion type, shape, friction, restitution).
 * This is the way to give a mesh real gameplay physics (gravity, collisions, impulses at runtime).
 */
export function setMeshPhysics(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isAbstractMesh(node)) {
		throw new Error(`Node "${node.name}" is not a mesh and cannot have a physics body.`);
	}

	const mesh = node as AbstractMesh;
	const enabled = data.enabled ?? true;

	if (!enabled) {
		if (mesh.physicsAggregate) {
			mesh.physicsAggregate.dispose();
		}
		mesh.physicsBody = null;
		mesh.physicsAggregate = null;
		if (mesh.metadata?.physicsAggregate) {
			delete mesh.metadata.physicsAggregate;
		}

		options.editor.layout.inspector.setEditedObject(mesh);
		options.editor.layout.inspector.forceUpdate();

		return { ...toNodeSummary(mesh), physics: null };
	}

	// Create the aggregate if missing, mirroring the editor inspector behavior.
	if (!mesh.physicsAggregate) {
		const shapeType = data.shapeType ? physicsShapeTypes[data.shapeType] : getPhysicsShapeForMesh(mesh);
		const aggregate = new PhysicsAggregate(mesh, shapeType ?? getPhysicsShapeForMesh(mesh), {
			mass: data.mass ?? 1,
		});
		aggregate.body.disableSync = true;
		mesh.physicsAggregate = aggregate;
	}

	const aggregate = mesh.physicsAggregate!;

	if (data.shapeType !== undefined) {
		const type = physicsShapeTypes[data.shapeType];
		if (type === undefined) {
			throw new Error(`Unknown physics shape type "${data.shapeType}". Supported: ${Object.keys(physicsShapeTypes).join(", ")}.`);
		}

		const shapeMesh = isInstancedMesh(mesh) ? mesh.sourceMesh : isMesh(mesh) ? (mesh as Mesh) : undefined;
		aggregate.shape = new PhysicsShape(
			{
				type,
				parameters: { mesh: type === PhysicsShapeType.MESH ? shapeMesh : undefined },
			},
			scene
		);
		aggregate.body.disableSync = true;
	}

	if (data.motionType !== undefined) {
		const motion = physicsMotionTypes[data.motionType];
		if (motion === undefined) {
			throw new Error(`Unknown physics motion type "${data.motionType}". Supported: ${Object.keys(physicsMotionTypes).join(", ")}.`);
		}
		aggregate.body.setMotionType(motion);
		aggregate.body.disableSync = true;
	}

	if (data.mass !== undefined) {
		aggregate.body.setMassProperties({ ...aggregate.body.getMassProperties(), mass: data.mass });
	}

	if (data.friction !== undefined || data.restitution !== undefined) {
		const material = { ...aggregate.shape.material };
		if (data.friction !== undefined) {
			material.friction = data.friction;
		}
		if (data.restitution !== undefined) {
			material.restitution = data.restitution;
		}
		aggregate.shape.material = material;
	}

	options.editor.layout.inspector.setEditedObject(mesh);
	options.editor.layout.inspector.forceUpdate();

	return { ...toNodeSummary(mesh), physics: describePhysics(mesh) };
}

/**
 * Converts a Vector3 to a plain `[x,y,z]` array.
 */
function vec3(v: Vector3): [number, number, number] {
	return [v.x, v.y, v.z];
}

/**
 * Returns the bounding information of a mesh, in local and world space, plus the world-space bounds of
 * its whole hierarchy (children included). Useful to scatter objects without overlap (e.g. forests) and
 * to place meshes on the ground precisely.
 */
export function getMeshBoundingInfo(scene: Scene, data: any): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isAbstractMesh(node)) {
		throw new Error(`Node "${node.name}" is not a mesh and has no bounding info.`);
	}

	const mesh = node as AbstractMesh;
	mesh.computeWorldMatrix(true);

	const boundingBox = mesh.getBoundingInfo().boundingBox;
	const hierarchy = mesh.getHierarchyBoundingVectors(true);

	const localSize = boundingBox.extendSize.scale(2);
	const worldSize = boundingBox.extendSizeWorld.scale(2);
	const hierarchySize = hierarchy.max.subtract(hierarchy.min);

	return {
		local: {
			min: vec3(boundingBox.minimum),
			max: vec3(boundingBox.maximum),
			center: vec3(boundingBox.center),
			size: vec3(localSize),
		},
		world: {
			min: vec3(boundingBox.minimumWorld),
			max: vec3(boundingBox.maximumWorld),
			center: vec3(boundingBox.centerWorld),
			size: vec3(worldSize),
		},
		hierarchyWorld: {
			min: vec3(hierarchy.min),
			max: vec3(hierarchy.max),
			size: vec3(hierarchySize),
		},
	};
}
