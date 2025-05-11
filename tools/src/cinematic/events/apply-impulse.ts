import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export type SetEnabledEventType = {
    mesh: string;
    radius: number;
    force: number[];
    contactPoint: number[];
};

export function handleApplyImpulseEvent(scene: Scene, config: SetEnabledEventType) {
    const force = Vector3.FromArray(config.force);
    const contactPoint = Vector3.FromArray(config.contactPoint);

    let meshes = config.mesh
        ? [scene.getNodeById(config.mesh) as AbstractMesh]
        : scene.meshes.filter((m) => m.physicsAggregate);

    if (config.radius) {
        meshes = meshes.filter((m) => {
            const centerWorld = m.getBoundingInfo().boundingBox.centerWorld;
            return Vector3.Distance(centerWorld, contactPoint) <= config.radius;
        });
    }

    meshes.forEach((mesh) => {
        mesh.physicsAggregate?.body?.applyImpulse(force, contactPoint);
    });
}
