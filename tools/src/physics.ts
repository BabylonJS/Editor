import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

/**
 * Parses and loads the physics aggregate data for the given mesh.
 * @param mesh defines the reference to the mesh object.
 */
export function configurePhysicsAggregate(mesh: AbstractMesh) {
    const data = mesh.metadata?.physicsAggregate;
    if (!data) {
        return;
    }

    const aggregate = new PhysicsAggregate(mesh, data.shape.type);

    aggregate.body.setMassProperties({
        mass: data.massProperties.mass,
        inertia: data.massProperties.inertia ? Vector3.FromArray(data.massProperties.inertia) : undefined,
        centerOfMass: data.massProperties.centerOfMass ? Vector3.FromArray(data.massProperties.centerOfMass) : undefined,
        inertiaOrientation: data.massProperties.inertiaOrientation ? Quaternion.FromArray(data.massProperties.inertiaOrientation) : undefined,
    });

    aggregate.shape.density = data.shape.density;
    aggregate.body.setMotionType(data.body.motionType);
    aggregate.material = data.material;

    mesh.metadata.physicsAggregate = undefined;
}
