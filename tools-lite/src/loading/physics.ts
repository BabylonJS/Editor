import {
	createPhysicsAggregate,
	createPhysicsShape,
	Mesh,
	PhysicsMotionType,
	PhysicsShape,
	PhysicsShapeType,
	PhysicsWorld,
	setPhysicsBodyMassProperties,
	setPhysicsBodyMotionType,
	setPhysicsShapeMaterial,
} from "@babylonjs/lite";

import { getNodeScene, getSceneData } from "../tools/scene";

/**
 * Parses and loads the physics aggregate data for the given mesh. The physics world used is the one given to
 * `loadScene` (see `SceneLoaderOptions.physicsWorld`): nothing is done when the scene has no physics world.
 * @param mesh defines the reference to the mesh object.
 * @param world defines the optional reference to the physics world (the one of the scene of the mesh by default).
 */
export function configurePhysicsAggregate(mesh: Mesh, world?: PhysicsWorld | null) {
	const data = mesh.metadata?.physicsAggregate;
	if (!data) {
		return;
	}

	const scene = getNodeScene(mesh);
	world ??= scene ? getSceneData(scene).physicsWorld : null;

	if (!world) {
		return;
	}

	let shape: PhysicsShape | undefined = undefined;

	// Mesh and convex hull shapes are built from the geometry of the mesh.
	if (data.shape.type === PhysicsShapeType.MESH || data.shape.type === PhysicsShapeType.CONVEX_HULL) {
		shape = createPhysicsShape(world, {
			type: data.shape.type,
			mesh,
		});
	}

	const aggregate = createPhysicsAggregate(world, mesh, data.shape.type, {
		mass: data.massProperties.mass,
		friction: data.material?.friction,
		restitution: data.material?.restitution,
		shape,
	});

	setPhysicsBodyMassProperties(world, aggregate.body, {
		mass: data.massProperties.mass,
		inertia: data.massProperties.inertia ? { x: data.massProperties.inertia[0], y: data.massProperties.inertia[1], z: data.massProperties.inertia[2] } : undefined,
		centerOfMass: data.massProperties.centerOfMass
			? { x: data.massProperties.centerOfMass[0], y: data.massProperties.centerOfMass[1], z: data.massProperties.centerOfMass[2] }
			: undefined,
		inertiaOrientation: data.massProperties.inertiaOrientation
			? {
					x: data.massProperties.inertiaOrientation[0],
					y: data.massProperties.inertiaOrientation[1],
					z: data.massProperties.inertiaOrientation[2],
					w: data.massProperties.inertiaOrientation[3],
				}
			: undefined,
	});

	setPhysicsBodyMotionType(world, aggregate.body, (data.body?.motionType ?? PhysicsMotionType.STATIC) as PhysicsMotionType);

	if (data.material) {
		setPhysicsShapeMaterial(world, aggregate.shape, data.material.friction ?? 0.5, data.material.restitution ?? 0, data.material.staticFriction);
	}

	mesh.physicsAggregate = aggregate;
	mesh.metadata!.physicsAggregate = undefined;
}
