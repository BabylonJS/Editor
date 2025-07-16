import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

import { isInstancedMesh, isMesh } from "../tools/guards";

/**
 * Parses and loads the physics aggregate data for the given mesh.
 * @param mesh defines the reference to the mesh object.
 */
export function configurePhysicsAggregate(transformNode: AbstractMesh) {
	const data = transformNode.metadata?.physicsAggregate;
	if (!data) {
		return;
	}

	let mesh: Mesh | undefined = undefined;
	if (isMesh(transformNode)) {
		mesh = transformNode;
	} else if (isInstancedMesh(transformNode)) {
		mesh = transformNode.sourceMesh;
	}

	const aggregate = new PhysicsAggregate(transformNode, data.shape.type, {
		mesh,
		mass: data.massProperties.mass,
	});

	aggregate.body.setMassProperties({
		mass: data.massProperties.mass,
		inertia: data.massProperties.inertia ? Vector3.FromArray(data.massProperties.inertia) : undefined,
		centerOfMass: data.massProperties.centerOfMass ? Vector3.FromArray(data.massProperties.centerOfMass) : undefined,
		inertiaOrientation: data.massProperties.inertiaOrientation ? Quaternion.FromArray(data.massProperties.inertiaOrientation) : undefined,
	});

	aggregate.shape.density = data.shape.density;
	aggregate.body.setMotionType(data.body.motionType);
	aggregate.shape.material = data.material;

	transformNode.physicsAggregate = aggregate;
	transformNode.metadata.physicsAggregate = undefined;
}
