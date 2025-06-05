import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export type SetEnabledEventType = {
    mesh: AbstractMesh;
    radius: number;
    force: Vector3;
    contactPoint: Vector3;
};

const zeroVector = Vector3.Zero();

export function handleApplyImpulseEvent(scene: Scene, config: SetEnabledEventType) {
    let meshes = config.mesh
        ? [config.mesh]
        : scene.meshes.filter((m) => m.physicsAggregate);

    if (config.radius) {
        meshes = meshes.filter((mesh) => {
            const centerWorld = mesh.getBoundingInfo().boundingBox.centerWorld;
            return Vector3.Distance(centerWorld, config.contactPoint) <= config.radius;
        });
    }

    meshes.forEach((mesh) => {
        if (mesh.physicsAggregate?.body) {
            const direction = config.contactPoint.subtract(mesh.getBoundingInfo().boundingBox.centerWorld);
            direction.multiplyInPlace(config.force);

            mesh.physicsAggregate.body.setLinearVelocity(zeroVector);
            mesh.physicsAggregate.body.setAngularVelocity(zeroVector);

            mesh.physicsAggregate.body.applyImpulse(direction.negateInPlace(), config.contactPoint);
        }
    });
}
