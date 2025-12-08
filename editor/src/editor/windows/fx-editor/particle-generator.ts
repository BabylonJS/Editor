import {
	Scene,
	ParticleSystem,
	SolidParticleSystem,
	AbstractMesh,
	MeshBuilder,
	Vector3,
	Color4,
	Color3,
	IParticleEmitterType,
	BoxParticleEmitter,
	ConeParticleEmitter,
	CylinderParticleEmitter,
	SphereParticleEmitter,
	HemisphericParticleEmitter,
	PointParticleEmitter,
	MeshParticleEmitter,
	Tools,
} from "babylonjs";
import { IFXParticleData } from "./properties/types";

/**
 * Creates a particle system or solid particle system from FX particle data
 */
export function createParticleSystemFromData(scene: Scene, particleData: IFXParticleData, emitter?: AbstractMesh): ParticleSystem | SolidParticleSystem | null {
	if (!emitter) {
		// Create default emitter if none provided
		emitter = MeshBuilder.CreateBox("emitter", { size: 0.1 }, scene);
		emitter.isVisible = false;
	}

	// Apply transform
	emitter.position = particleData.position.clone();
	emitter.rotation = particleData.rotation.clone();
	emitter.scaling = particleData.scale.clone();
	emitter.setEnabled(particleData.visibility);

	// Check if we need SolidParticleSystem (for Mesh render mode)
	if (particleData.particleRenderer.renderMode === "Mesh") {
		return createSolidParticleSystemFromData(scene, particleData, emitter);
	}

	// Create regular ParticleSystem
	const capacity = 1000; // Default capacity
	const particleSystem = new ParticleSystem(particleData.name || "Particle System", capacity, scene);
	particleSystem.id = particleData.id || Tools.RandomId();
	particleSystem.emitter = emitter;

	// Configure emitter shape
	configureEmitterShape(particleSystem, particleData.emitterShape);

	// Configure emission
	particleSystem.targetStopDuration = particleData.emission.duration;
	particleSystem.manualEmitCount = particleData.emission.emitOverTime;
	particleSystem.emitRate = particleData.emission.emitOverTime;
	particleSystem.minEmitPower = particleData.particleInitialization.startSpeed.min;
	particleSystem.maxEmitPower = particleData.particleInitialization.startSpeed.max;

	// Configure particle initialization
	particleSystem.minLifeTime = particleData.particleInitialization.startLife.min;
	particleSystem.maxLifeTime = particleData.particleInitialization.startLife.max;
	particleSystem.minSize = particleData.particleInitialization.startSize.min;
	particleSystem.maxSize = particleData.particleInitialization.startSize.max;
	particleSystem.minEmitBox = particleData.emitterShape.minEmitBox?.clone() || new Vector3(-0.5, -0.5, -0.5);
	particleSystem.maxEmitBox = particleData.emitterShape.maxEmitBox?.clone() || new Vector3(0.5, 0.5, 0.5);

	// Configure color
	const startColor = particleData.particleInitialization.startColor;
	particleSystem.color1 = new Color4(startColor.r, startColor.g, startColor.b, startColor.a);
	particleSystem.color2 = new Color4(startColor.r, startColor.g, startColor.b, startColor.a);
	particleSystem.colorDead = new Color4(startColor.r, startColor.g, startColor.b, 0);

	// Configure renderer
	if (particleData.particleRenderer.texture) {
		particleSystem.particleTexture = particleData.particleRenderer.texture;
	}

	// Configure looping
	particleSystem.targetStopDuration = particleData.emission.looping ? undefined : particleData.emission.duration;

	// TODO: Apply behaviors
	// TODO: Apply bursts

	return particleSystem;
}

/**
 * Creates a SolidParticleSystem for Mesh render mode
 */
function createSolidParticleSystemFromData(scene: Scene, particleData: IFXParticleData, emitter: AbstractMesh): SolidParticleSystem | null {
	// For SolidParticleSystem, we need a mesh to use as the particle shape
	let particleMesh: AbstractMesh | null = null;

	if (particleData.particleRenderer.meshPath) {
		// TODO: Load mesh from path
		// For now, create a default box
		particleMesh = MeshBuilder.CreateBox("particleMesh", { size: 0.1 }, scene);
	} else {
		// Default particle mesh
		particleMesh = MeshBuilder.CreateBox("particleMesh", { size: 0.1 }, scene);
	}

	if (!particleMesh) {
		return null;
	}

	const sps = new SolidParticleSystem("SolidParticleSystem", scene);
	sps.addShape(particleMesh, 1000); // Add shape with capacity
	const mesh = sps.buildMesh();

	// Set emitter
	mesh.position = particleData.position.clone();
	mesh.rotation = particleData.rotation.clone();
	mesh.scaling = particleData.scale.clone();
	mesh.setEnabled(particleData.visibility);

	// TODO: Configure SPS properties based on particleData
	// TODO: Apply behaviors
	// TODO: Apply emission settings

	return sps;
}

/**
 * Configures the emitter shape for a particle system
 */
function configureEmitterShape(particleSystem: ParticleSystem, emitterShape: IFXParticleData["emitterShape"]): void {
	let emitter: IParticleEmitterType;

	switch (emitterShape.shape) {
		case "Box":
			emitter = new BoxParticleEmitter();
			if (emitterShape.minEmitBox && emitterShape.maxEmitBox) {
				(emitter as BoxParticleEmitter).minEmitBox = emitterShape.minEmitBox.clone();
				(emitter as BoxParticleEmitter).maxEmitBox = emitterShape.maxEmitBox.clone();
			}
			if (emitterShape.direction1 && emitterShape.direction2) {
				particleSystem.direction1 = emitterShape.direction1.clone();
				particleSystem.direction2 = emitterShape.direction2.clone();
			}
			break;

		case "Cone":
			emitter = new ConeParticleEmitter(emitterShape.radius || 1.0, emitterShape.angle || 0.785398);
			// TODO: Configure cone-specific properties
			break;

		case "Cylinder":
			emitter = new CylinderParticleEmitter(emitterShape.radius || 1.0, emitterShape.height || 1.0);
			// TODO: Configure cylinder-specific properties
			break;

		case "Sphere":
			emitter = new SphereParticleEmitter(emitterShape.radius || 1.0);
			// TODO: Configure sphere-specific properties
			break;

		case "Hemispheric":
			emitter = new HemisphericParticleEmitter(emitterShape.radius || 1.0);
			// TODO: Configure hemispheric-specific properties
			break;

		case "Point":
			emitter = new PointParticleEmitter();
			break;

		case "Mesh":
			// TODO: Load mesh and create MeshParticleEmitter
			emitter = new PointParticleEmitter(); // Fallback
			break;

		default:
			emitter = new BoxParticleEmitter();
			break;
	}

	particleSystem.particleEmitterType = emitter;
}

/**
 * Creates an empty mesh for grouping particles
 */
export function createGroupMesh(scene: Scene, name: string, position: Vector3 = Vector3.Zero(), rotation: Vector3 = Vector3.Zero(), scale: Vector3 = new Vector3(1, 1, 1)): AbstractMesh {
	const mesh = MeshBuilder.CreateBox(name, { size: 0.01 }, scene);
	mesh.isVisible = false;
	mesh.position = position;
	mesh.rotation = rotation;
	mesh.scaling = scale;
	return mesh;
}

