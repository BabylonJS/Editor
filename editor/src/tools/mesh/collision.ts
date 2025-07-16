import { Mesh } from "babylonjs";

import { isCollisionMesh } from "../guards/nodes";

import { CollisionMesh } from "../../editor/nodes/collision";

/**
 * Looking for descendants of the given mesh, returns the reference to the first collision
 * mesh found. A collision mesh is unique per mesh.
 */
export function getCollisionMeshFor(mesh: Mesh) {
	return mesh.getDescendants(true, (p) => isCollisionMesh(p))[0] as CollisionMesh | null;
}
