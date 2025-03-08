import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type SetEnabledEventType = {
    mesh: string;
    force: number[];
    contactPoint: number[];
};

export function handleApplyImpulseEvent(scene: Scene, config: SetEnabledEventType) {
    const meshes = config.mesh
        ? [scene.getNodeById(config.mesh)]
        : [scene.meshes];

    meshes.forEach((mesh) => {
        if (mesh.physicsAggregate?.body) {
            mesh.physicsAggregate.body.applyImpulse(
                Vector3.FromArray(config.force),
                Vector3.FromArray(config.contactPoint),
            );
        }
    });
}
