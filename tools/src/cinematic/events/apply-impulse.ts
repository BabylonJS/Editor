import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

declare module "@babylonjs/core/Meshes/abstractMesh" {
    export interface AbstractMesh {
        physicsAggregate?: PhysicsAggregate | null;
    }
}

export type SetEnabledEventType = {
    mesh: string;
    force: number[];
    contactPoint: number[];
};

export function handleApplyImpulseEvent(scene: Scene, config: SetEnabledEventType) {
    const meshes = config.mesh
        ? [scene.getNodeById(config.mesh) as AbstractMesh]
        : scene.meshes;

    meshes.forEach((mesh) => {
        if (mesh.physicsAggregate?.body) {
            mesh.physicsAggregate.body.applyImpulse(
                Vector3.FromArray(config.force),
                Vector3.FromArray(config.contactPoint),
            );
        }
    });
}
