import { applyPhysicsBodyImpulse, Mesh, SceneContext, setPhysicsBodyAngularVelocity, setPhysicsBodyLinearVelocity, Vec3 } from "@babylonjs/lite";

import { getSceneData } from "../../tools/scene";
import { distanceVec3 } from "../../tools/maths";
import { getMeshWorldBoundingBox } from "../../tools/mesh";

export type ApplyImpulseEventType = {
	mesh: Mesh | null;
	radius: number;
	force: Vec3;
	contactPoint: Vec3;
};

const zeroVector: Vec3 = { x: 0, y: 0, z: 0 };

export function handleApplyImpulseEvent(scene: SceneContext, config: ApplyImpulseEventType) {
	const sceneData = getSceneData(scene);
	const world = sceneData.physicsWorld;

	if (!world) {
		return;
	}

	let meshes = config.mesh ? [config.mesh] : sceneData.meshes.filter((m) => m.physicsAggregate);

	if (config.radius) {
		meshes = meshes.filter((mesh) => {
			const centerWorld = getMeshWorldBoundingBox(mesh).center;
			return distanceVec3(centerWorld, config.contactPoint) <= config.radius;
		});
	}

	meshes.forEach((mesh) => {
		const body = mesh.physicsAggregate?.body;
		if (!body) {
			return;
		}

		const centerWorld = getMeshWorldBoundingBox(mesh).center;

		// Same as Babylon.js: (contactPoint - center) * force, negated.
		const impulse: Vec3 = {
			x: -(config.contactPoint.x - centerWorld.x) * config.force.x,
			y: -(config.contactPoint.y - centerWorld.y) * config.force.y,
			z: -(config.contactPoint.z - centerWorld.z) * config.force.z,
		};

		setPhysicsBodyLinearVelocity(world, body, zeroVector);
		setPhysicsBodyAngularVelocity(world, body, zeroVector);

		applyPhysicsBodyImpulse(body, impulse, config.contactPoint);
	});
}
