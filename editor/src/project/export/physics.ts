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
		if (!mesh || !isMesh(mesh)) {
			return;
		}

		if (mesh.physicsAggregate) {
			m.metadata ??= {};
			m.metadata.physicsAggregate = serializePhysicsAggregate(mesh.physicsAggregate);
		}

		m.instances?.forEach((instance) => {
			const instancedMesh = mesh.instances.find((i) => i.id === instance.id);
			if (instancedMesh?.physicsAggregate) {
				instance.metadata ??= {};
				instance.metadata.physicsAggregate = serializePhysicsAggregate(instancedMesh.physicsAggregate);
			}
		});
	});
}
