import { Scene } from "babylonjs";

import { isMesh } from "../../tools/guards/nodes";
import { serializePhysicsAggregate } from "../../tools/physics/serialization/aggregate";

/**
 * Configures the given data from scene serializer to support physics.
 * @param data defines the JSON data coming from the scene serializer.
 * @param scene defines the scene that contains the source meshes.
 */
export function configureMeshesPhysics(data: any, scene: Scene) {
    data.meshes?.forEach((m: any) => {
        if (!m) {
            return;
        }

        const mesh = scene.getMeshById(m.id);
        if (!mesh || !isMesh(mesh) || !mesh.physicsAggregate) {
            return;
        }

        m.metadata ??= {};
        m.metadata.physicsAggregate = serializePhysicsAggregate(mesh.physicsAggregate);
    });
}
