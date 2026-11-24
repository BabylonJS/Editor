import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

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

	let lodMesh: Mesh | null = null;
	if (mesh && data.shape.type === PhysicsShapeType.MESH) {
		lodMesh = mesh?.getLODLevels().find((lodLevel) => lodLevel.mesh && lodLevel.mesh.getTotalVertices() > 0)?.mesh ?? null;
	}

	const lodMeshScaling = lodMesh?.scaling.clone();

	if (lodMesh) {
		// Scaling must be applied to the LOD mesh to match the world scaling of the transform node before creating the physics shape.
		transformNode.computeWorldMatrix(true);
		lodMesh.scaling.copyFrom(transformNode.absoluteScaling);
	}

	const aggregate = new PhysicsAggregate(transformNode, data.shape.type, {
		mesh: lodMesh ?? mesh,
		mass: data.massProperties.mass,
	});

	if (lodMesh && lodMeshScaling) {
		// Restore the original scaling of the LOD mesh after the physics shape has been created.
		lodMesh.scaling.copyFrom(lodMeshScaling);
		lodMesh.computeWorldMatrix(true);
	}

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
