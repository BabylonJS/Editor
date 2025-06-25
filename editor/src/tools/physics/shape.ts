import { AbstractMesh, PhysicsShapeType } from "babylonjs";

import { isInstancedMesh, isMesh } from "../guards/nodes";

import { getCollisionMeshFor } from "../mesh/collision";

/**
 * Returns the type of shape that should be applied by default for the given mesh.
 * Will check its metadata and collisions to determine the best shape.
 * @param mesh defines the reference to the mesh to check its nature and determine the physics shape.
 */
export function getPhysicsShapeForMesh(mesh: AbstractMesh): PhysicsShapeType {
	mesh = isInstancedMesh(mesh) ? mesh.sourceMesh : mesh;

	switch (mesh.metadata?.type) {
	case "Box":
	case "Ground":
		return PhysicsShapeType.BOX;

	case "Sphere":
		return PhysicsShapeType.SPHERE;
	}

	if (isMesh(mesh)) {
		const collisionMesh = getCollisionMeshFor(mesh);

		switch (collisionMesh?.type) {
		case "cube":
			return PhysicsShapeType.BOX;
		case "capsule":
			return PhysicsShapeType.CAPSULE;
		case "sphere":
			return PhysicsShapeType.SPHERE;
		case "lod":
			return PhysicsShapeType.MESH;
		}
	}

	return PhysicsShapeType.MESH;
}
