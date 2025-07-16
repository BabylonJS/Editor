import { TransformNode, PhysicsAggregate, Vector3, Quaternion, Mesh } from "babylonjs";

import { isInstancedMesh, isMesh } from "../../guards/nodes";

/**
 * Returns the JSON representation of the given physics aggregate.
 * @param aggregate defines the reference to the physics aggregate object to serialize.
 */
export function serializePhysicsAggregate(aggregate: PhysicsAggregate) {
	return {
		shape: {
			type: aggregate.shape.type,
			density: aggregate.shape.density,
		},
		body: {
			motionType: aggregate.body.getMotionType(),
		},
		massProperties: {
			mass: aggregate.body.getMassProperties().mass,
			inertia: aggregate.body.getMassProperties().inertia?.asArray(),
			centerOfMass: aggregate.body.getMassProperties().centerOfMass?.asArray(),
			inertiaOrientation: aggregate.body.getMassProperties().inertiaOrientation?.asArray(),
		},
		material: {
			friction: aggregate.shape.material.friction,
			restitution: aggregate.shape.material.restitution,
			staticFriction: aggregate.shape.material.staticFriction,
			frictionCombine: aggregate.shape.material.frictionCombine,
			restitutionCombine: aggregate.shape.material.restitutionCombine,
		},
	};
}

/**
 * Returns a new instance of PhysicsAggregate from the given JSON representation.
 * @param transformNode defines the reference to the transform node to setup the physics aggregate.
 * @param data defines the JSON representation of the physics aggregate to parse.
 */
export function parsePhysicsAggregate(transformNode: TransformNode, data: any) {
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

	return aggregate;
}
