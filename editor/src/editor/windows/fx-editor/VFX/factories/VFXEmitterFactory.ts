import { Mesh, CreatePlane, Nullable, Color4, Matrix, ParticleSystem, SolidParticleSystem, Constants, Vector3, Quaternion } from "babylonjs";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXParseContext } from "../types/context";
import type { VFXLoaderOptions } from "../types/loader";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXValueParser } from "../parsers/VFXValueParser";
import type { IVFXMaterialFactory, IVFXGeometryFactory } from "../types/factories";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import { VFXBehaviorFunctionFactory } from "./VFXBehaviorFunctionFactory";
import {
	applyColorOverLifePS,
	applySizeOverLifePS,
	applyRotationOverLifePS,
	applyForceOverLifePS,
	applyGravityForcePS,
	applySpeedOverLifePS,
	applyFrameOverLifePS,
	applyLimitSpeedOverLifePS,
} from "../behaviors";

/**
 * Factory for creating particle emitters (ParticleSystem and SolidParticleSystem)
 */
export class VFXEmitterFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _valueParser: VFXValueParser;
	private _materialFactory: IVFXMaterialFactory;
	private _geometryFactory: IVFXGeometryFactory;

	constructor(context: VFXParseContext, valueParser: VFXValueParser, materialFactory: IVFXMaterialFactory, geometryFactory: IVFXGeometryFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXEmitterFactory]");
		this._valueParser = valueParser;
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
	}

	/**
	 * Create a particle emitter from emitter data
	 */
	public createEmitter(emitterData: VFXEmitterData): Nullable<ParticleSystem | SolidParticleSystem> {
		const { config } = emitterData;
		const { options } = this._context;

		// Check if we need SolidParticleSystem (mesh-based particles)
		const useSolidParticles = config.renderMode === 2;
		this._logger.log(`Using ${useSolidParticles ? "SolidParticleSystem" : "ParticleSystem"}`, options);

		if (useSolidParticles) {
			return this._createSolidParticleSystem(emitterData);
		} else {
			return this._createParticleSystem(emitterData);
		}
	}

	/**
	 * Create a ParticleSystem (billboard-based particles)
	 */
	private _createParticleSystem(emitterData: VFXEmitterData): Nullable<ParticleSystem> {
		const { name, config } = emitterData;
		const { scene, options } = this._context;

		this._logger.log(`Creating ParticleSystem: ${name}`, options);

		// Calculate capacity based on emission rate and duration
		const emissionRate = config.emissionOverTime !== undefined ? this._valueParser.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const capacity = Math.ceil(emissionRate * duration * 2); // Add some buffer
		this._logger.log(`  Emission rate: ${emissionRate}, Duration: ${duration}, Capacity: ${capacity}`, options);

		// Parse life time
		const lifeTime = config.startLife !== undefined ? this._valueParser.parseIntervalValue(config.startLife) : { min: 1, max: 1 };
		this._logger.log(`  Life time: ${lifeTime.min} - ${lifeTime.max}`, options);

		// Parse speed
		const speed = config.startSpeed !== undefined ? this._valueParser.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const avgStartSpeed = (speed.min + speed.max) / 2;
		this._logger.log(`  Speed: ${speed.min} - ${speed.max}`, options);

		// Parse size
		const size = config.startSize !== undefined ? this._valueParser.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const avgStartSize = (size.min + size.max) / 2;
		this._logger.log(`  Size: ${size.min} - ${size.max}`, options);

		// Parse start color
		const startColor = config.startColor !== undefined ? this._valueParser.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);
		this._logger.log(`  Start color: R=${startColor.r}, G=${startColor.g}, B=${startColor.b}, A=${startColor.a}`, options);

		// Create VFXParticleSystem instead of regular ParticleSystem
		const particleSystem = new VFXParticleSystem(name, capacity, scene, this._valueParser, avgStartSpeed, avgStartSize, startColor);

		// Set basic properties
		particleSystem.targetStopDuration = duration;
		particleSystem.emitRate = emissionRate;
		particleSystem.manualEmitCount = -1;

		// Set life time
		particleSystem.minLifeTime = lifeTime.min;
		particleSystem.maxLifeTime = lifeTime.max;

		// Set speed and size
		particleSystem.minEmitPower = speed.min;
		particleSystem.maxEmitPower = speed.max;
		particleSystem.minSize = size.min;
		particleSystem.maxSize = size.max;

		// Set colors
		particleSystem.color1 = startColor;
		particleSystem.color2 = startColor;
		particleSystem.colorDead = new Color4(startColor.r, startColor.g, startColor.b, 0);

		// Parse start rotation
		if (config.startRotation) {
			if (typeof config.startRotation === "object" && config.startRotation !== null && "type" in config.startRotation && config.startRotation.type === "Euler") {
				const eulerRotation = config.startRotation;
				if (eulerRotation.angleZ !== undefined) {
					const angleZ = this._valueParser.parseIntervalValue(eulerRotation.angleZ);
					particleSystem.minInitialRotation = angleZ.min;
					particleSystem.maxInitialRotation = angleZ.max;
				}
			} else {
				const rotation = this._valueParser.parseIntervalValue(config.startRotation);
				particleSystem.minInitialRotation = rotation.min;
				particleSystem.maxInitialRotation = rotation.max;
			}
		}

		// Set sprite tiles if specified
		if (config.uTileCount !== undefined && config.vTileCount !== undefined) {
			if (config.uTileCount > 1 || config.vTileCount > 1) {
				particleSystem.isAnimationSheetEnabled = true;
				particleSystem.spriteCellWidth = config.uTileCount;
				particleSystem.spriteCellHeight = config.vTileCount;
				if (config.startTileIndex !== undefined) {
					const startTile = this._valueParser.parseConstantValue(config.startTileIndex);
					particleSystem.startSpriteCellID = Math.floor(startTile);
					particleSystem.endSpriteCellID = Math.floor(startTile);
				}
			}
		}

		// Set render order and layers
		if (config.renderOrder !== undefined) {
			particleSystem.renderingGroupId = config.renderOrder;
		}
		if (config.layers !== undefined) {
			particleSystem.layerMask = config.layers;
		}

		// Set emitter shape (pass matrix to extract rotation for emitter direction)
		this._setEmitterShape(particleSystem, config.shape, emitterData.cumulativeScale, emitterData.matrix, options);

		// Load texture (ParticleSystem only needs texture, not material)
		if (emitterData.materialId) {
			const texture = this._materialFactory.createTexture(emitterData.materialId);
			if (texture) {
				particleSystem.particleTexture = texture;
				// Get blend mode from material
				const { jsonData } = this._context;
				const material = jsonData.materials?.find((m: any) => m.uuid === emitterData.materialId);
				if (material?.blending !== undefined) {
					if (material.blending === 2) {
						// Additive blending (Three.js AdditiveBlending)
						particleSystem.blendMode = Constants.ALPHA_ADD;
					} else if (material.blending === 1) {
						// Normal blending (Three.js NormalBlending)
						particleSystem.blendMode = Constants.ALPHA_COMBINE;
					} else if (material.blending === 0) {
						// No blending (Three.js NoBlending)
						particleSystem.blendMode = Constants.ALPHA_DISABLE;
					}
				}
			}
		}

		// Handle emission bursts
		if (config.emissionBursts && Array.isArray(config.emissionBursts) && config.emissionBursts.length > 0) {
			this._applyEmissionBursts(particleSystem, config.emissionBursts, emissionRate, duration, options);
		}

		// Apply behaviors
		if (config.behaviors && Array.isArray(config.behaviors) && config.behaviors.length > 0) {
			this._applyBehaviorsToPS(particleSystem, config.behaviors);
		}

		// Set world space
		if (config.worldSpace !== undefined) {
			particleSystem.isLocal = !config.worldSpace;
			this._logger.log(`  World space: ${config.worldSpace}`, options);
		}

		// Set looping
		if (config.looping !== undefined) {
			particleSystem.targetStopDuration = config.looping ? 0 : duration;
			this._logger.log(`  Looping: ${config.looping}`, options);
		}

		// Set render mode
		if (config.renderMode !== undefined) {
			if (config.renderMode === 0) {
				particleSystem.isBillboardBased = true;
				this._logger.log(`  Render mode: Billboard`, options);
			} else if (config.renderMode === 1) {
				particleSystem.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
				this._logger.log(`  Render mode: Stretched Billboard`, options);
			}
		}

		// Set soft particles and auto destroy
		if (config.softParticles !== undefined) {
			this._logger.log(`  Soft particles: ${config.softParticles} (not fully supported)`, options);
		}
		if (config.autoDestroy !== undefined) {
			particleSystem.disposeOnStop = config.autoDestroy;
			this._logger.log(`  Auto destroy: ${config.autoDestroy}`, options);
		}

		this._logger.log(`ParticleSystem created: ${name}`, options);
		return particleSystem;
	}

	/**
	 * Create a SolidParticleSystem (mesh-based particles)
	 */
	private _createSolidParticleSystem(emitterData: VFXEmitterData): Nullable<SolidParticleSystem> {
		const { name, config } = emitterData;
		const { scene, options } = this._context;

		this._logger.log(`Creating SolidParticleSystem: ${name}`, options);

		// Calculate capacity based on emission rate and particle lifetime
		// duration = particle lifetime (how long each particle lives)
		// startLife = when particle becomes "alive" (for behaviors that depend on age)
		// emissionOverTime = particles per second (e.g., 2.5 means 2.5 particles per second)
		const emissionRate = config.emissionOverTime !== undefined ? this._valueParser.parseConstantValue(config.emissionOverTime) : 10; // particles per second
		const particleLifetime = config.duration || 5; // duration is the particle lifetime
		const isLooping = config.looping !== false;

		let capacity: number;
		if (isLooping) {
			// For looping systems: capacity = emissionRate * particleLifetime
			// This gives the steady-state number of particles needed for perfect looping
			// Example: emissionRate=2.5 particles/sec, particleLifetime=5 sec
			// -> capacity = 2.5 * 5 = 12.5 -> 13 particles
			// This ensures we have enough particles to cover the lifetime at the emission rate
			capacity = Math.ceil(emissionRate * particleLifetime);
			// Ensure minimum capacity of at least 1
			capacity = Math.max(capacity, 1);
			this._logger.log(`  Looping system: Emission rate: ${emissionRate} particles/sec, Particle lifetime: ${particleLifetime} sec, Capacity: ${capacity}`, options);
		} else {
			// For non-looping: capacity = emissionRate * particleLifetime * 2 (buffer for particles still alive)
			capacity = Math.ceil(emissionRate * particleLifetime * 2);
			this._logger.log(`  Non-looping system: Emission rate: ${emissionRate} particles/sec, Particle lifetime: ${particleLifetime} sec, Capacity: ${capacity}`, options);
		}

		// Get VFX transform from emitter data (stored during conversion)
		// This is the clean way - transform is already in left-handed coordinate system
		let vfxTransform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null = null;
		const vfxEmitter = emitterData.vfxEmitter;
		if (vfxEmitter && vfxEmitter.transform) {
			vfxTransform = vfxEmitter.transform;
		}

		const sps = new VFXSolidParticleSystem(name, scene, config, this._valueParser, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
			parentGroup: emitterData.parentGroup,
			vfxTransform: vfxTransform,
			logger: this._logger,
			loaderOptions: options,
		});

		// Load geometry for particle shape
		let particleMesh: Nullable<Mesh> = null;
		if (config.instancingGeometry) {
			this._logger.log(`  Loading geometry: ${config.instancingGeometry}`, options);
			particleMesh = this._geometryFactory.createMesh(config.instancingGeometry, emitterData.materialId, name + "_shape");
			if (!particleMesh) {
				this._logger.warn(`  Failed to load geometry ${config.instancingGeometry}, will create default plane`, options);
			}
		}

		// Default to plane if no geometry found
		if (!particleMesh) {
			this._logger.log(`  Creating default plane geometry`, options);
			particleMesh = CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
			if (emitterData.materialId && particleMesh) {
				const particleMaterial = this._materialFactory.createMaterial(emitterData.materialId, name);
				if (particleMaterial) {
					particleMesh.material = particleMaterial;
				}
			}
		} else {
			// Ensure material is applied
			if (emitterData.materialId && particleMesh && !particleMesh.material) {
				const particleMaterial = this._materialFactory.createMaterial(emitterData.materialId, name);
				if (particleMaterial) {
					particleMesh.material = particleMaterial;
				}
			}
		}

		if (!particleMesh) {
			this._logger.warn(`  Cannot add shape to SPS: particleMesh is null`, options);
			return null;
		}

		this._logger.log(`  Adding shape to SPS: mesh name=${particleMesh.name}, hasMaterial=${!!particleMesh.material}`, options);
		sps.addShape(particleMesh, capacity);

		// Set billboard mode if needed
		if (config.renderMode === 0 || config.renderMode === 1) {
			sps.billboard = true;
		}

		// Apply behaviors to SPS
		if (config.behaviors && Array.isArray(config.behaviors) && config.behaviors.length > 0) {
			this._applyBehaviorsToSPS(sps, config.behaviors);
			this._logger.log(`  Set SPS behaviors (${config.behaviors.length})`, options);
		}

		// Cleanup temporary mesh
		if (particleMesh) {
			particleMesh.dispose();
		}

		this._logger.log(`SolidParticleSystem created: ${name}`, options);
		return sps;
	}

	/**
	 * Set the emitter shape based on Three.js shape configuration
	 * @param matrix Optional 4x4 matrix array from Three.js to extract rotation
	 */
	private _setEmitterShape(particleSystem: ParticleSystem, shape: any, cumulativeScale: Vector3, matrix?: number[], options?: VFXLoaderOptions): void {
		if (!shape || !shape.type) {
			particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
			return;
		}

		const scaleX = cumulativeScale.x;
		const scaleY = cumulativeScale.y;
		const scaleZ = cumulativeScale.z;

		// Extract rotation from matrix if provided
		let rotationMatrix: Matrix | null = null;
		if (matrix && matrix.length >= 16) {
			// Three.js uses column-major order, Babylon.js uses row-major
			const mat = Matrix.FromArray(matrix);
			mat.transpose();

			// Extract rotation matrix (remove scale and translation)
			rotationMatrix = mat.getRotationMatrix();
			this._logger.log(`  Extracted rotation from matrix`, options);
		}

		// Helper function to apply rotation to default direction
		const applyRotation = (defaultDir: Vector3): Vector3 => {
			if (rotationMatrix) {
				const rotatedDir = Vector3.Zero();
				Vector3.TransformNormalToRef(defaultDir, rotationMatrix, rotatedDir);
				return rotatedDir;
			}
			return defaultDir;
		};

		switch (shape.type.toLowerCase()) {
			case "cone": {
				let radius = shape.radius || 1;
				const angle = shape.angle !== undefined ? shape.angle : Math.PI / 4;
				const coneScale = (scaleX + scaleZ) / 2;
				radius = radius * coneScale;

				// Default direction for cone is up (0, 1, 0)
				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					// Use directed emitter with rotated direction
					particleSystem.createDirectedConeEmitter(radius, angle, rotatedDir, rotatedDir);
					this._logger.log(
						`  Created directed cone emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
						options
					);
				} else {
					particleSystem.createConeEmitter(radius, angle);
				}
				break;
			}

			case "sphere": {
				let sphereRadius = shape.radius || 1;
				const sphereScale = (scaleX + scaleY + scaleZ) / 3;
				sphereRadius = sphereRadius * sphereScale;

				// Default direction for sphere is up (0, 1, 0)
				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					particleSystem.createDirectedSphereEmitter(sphereRadius, rotatedDir, rotatedDir);
					this._logger.log(
						`  Created directed sphere emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
						options
					);
				} else {
					particleSystem.createSphereEmitter(sphereRadius);
				}
				break;
			}

			case "point": {
				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					particleSystem.createPointEmitter(rotatedDir, rotatedDir);
					this._logger.log(
						`  Created point emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
						options
					);
				} else {
					particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
				}
				break;
			}

			case "box": {
				let boxSize = shape.size || [1, 1, 1];
				boxSize = [boxSize[0] * scaleX, boxSize[1] * scaleY, boxSize[2] * scaleZ];
				const minBox = new Vector3(-boxSize[0] / 2, -boxSize[1] / 2, -boxSize[2] / 2);
				const maxBox = new Vector3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2);

				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					particleSystem.createBoxEmitter(rotatedDir, rotatedDir, minBox, maxBox);
					this._logger.log(`  Created box emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`, options);
				} else {
					particleSystem.createBoxEmitter(Vector3.Zero(), Vector3.Zero(), minBox, maxBox);
				}
				break;
			}

			case "hemisphere": {
				let hemRadius = shape.radius || 1;
				const hemScale = (scaleX + scaleY + scaleZ) / 3;
				hemRadius = hemRadius * hemScale;
				particleSystem.createHemisphericEmitter(hemRadius);
				break;
			}

			case "cylinder": {
				let cylRadius = shape.radius || 1;
				let height = shape.height || 1;
				const cylRadiusScale = (scaleX + scaleZ) / 2;
				cylRadius = cylRadius * cylRadiusScale;
				height = height * scaleY;

				// Default direction for cylinder is up (0, 1, 0)
				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					particleSystem.createDirectedCylinderEmitter(cylRadius, height, 1, rotatedDir, rotatedDir);
					this._logger.log(
						`  Created directed cylinder emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
						options
					);
				} else {
					particleSystem.createCylinderEmitter(cylRadius, height);
				}
				break;
			}

			default: {
				const defaultDir = new Vector3(0, 1, 0);
				const rotatedDir = applyRotation(defaultDir);

				if (rotationMatrix) {
					particleSystem.createPointEmitter(rotatedDir, rotatedDir);
				} else {
					particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
				}
				break;
			}
		}
	}

	/**
	 * Apply emission bursts via emit rate gradients
	 */
	private _applyEmissionBursts(
		particleSystem: ParticleSystem,
		bursts: import("../types/emitterConfig").VFXEmissionBurst[],
		baseEmitRate: number,
		duration: number,
		_options?: VFXLoaderOptions
	): void {
		for (const burst of bursts) {
			if (burst.time !== undefined && burst.count !== undefined) {
				const burstTime = this._valueParser.parseConstantValue(burst.time);
				const burstCount = this._valueParser.parseConstantValue(burst.count);
				const timeRatio = Math.min(Math.max(burstTime / duration, 0), 1);

				const windowSize = 0.02;
				const burstEmitRate = burstCount / windowSize;

				const beforeTime = Math.max(0, timeRatio - windowSize);
				const afterTime = Math.min(1, timeRatio + windowSize);

				particleSystem.addEmitRateGradient(beforeTime, baseEmitRate);
				particleSystem.addEmitRateGradient(timeRatio, burstEmitRate);
				particleSystem.addEmitRateGradient(afterTime, baseEmitRate);
			}
		}
	}

	/**
	 * Apply behaviors to ParticleSystem
	 */
	private _applyBehaviorsToPS(particleSystem: ParticleSystem, behaviors: import("../types/behaviors").VFXBehavior[]): void {
		const { options } = this._context;
		const valueParser = this._valueParser;

		const vfxPS = particleSystem as any as VFXParticleSystem;
		if (vfxPS && typeof vfxPS.setPerParticleBehaviors === "function") {
			// Apply system-level behaviors (gradients, etc.)
			for (const behavior of behaviors) {
				if (!behavior.type) {
					this._logger.warn(`Behavior missing type: ${JSON.stringify(behavior)}`, options);
					continue;
				}

				this._logger.log(`  Processing behavior: ${behavior.type}`, options);

				switch (behavior.type) {
					case "ColorOverLife":
						applyColorOverLifePS(particleSystem, behavior as any);
						break;
					case "SizeOverLife":
						applySizeOverLifePS(particleSystem, behavior as any);
						break;
					case "RotationOverLife":
					case "Rotation3DOverLife":
						applyRotationOverLifePS(particleSystem, behavior as any, valueParser);
						break;
					case "ForceOverLife":
					case "ApplyForce":
						applyForceOverLifePS(particleSystem, behavior as any, valueParser);
						break;
					case "GravityForce":
						applyGravityForcePS(particleSystem, behavior as any, valueParser);
						break;
					case "SpeedOverLife":
						applySpeedOverLifePS(particleSystem, behavior as any, valueParser);
						break;
					case "FrameOverLife":
						applyFrameOverLifePS(particleSystem, behavior as any, valueParser);
						break;
					case "LimitSpeedOverLife":
						applyLimitSpeedOverLifePS(particleSystem, behavior as any, valueParser);
						break;
				}
			}

			// Create and set per-particle behavior functions
			const perParticleFunctions = VFXBehaviorFunctionFactory.createPerParticleFunctionsPS(behaviors, valueParser, particleSystem);
			vfxPS.setPerParticleBehaviors(perParticleFunctions);
		}
	}

	/**
	 * Apply behaviors to SolidParticleSystem
	 */
	private _applyBehaviorsToSPS(sps: SolidParticleSystem, behaviors: import("../types/behaviors").VFXBehavior[]): void {
		const vfxSPS = sps as any as VFXSolidParticleSystem;
		if (vfxSPS && typeof vfxSPS.setPerParticleBehaviors === "function") {
			const perParticleFunctions = VFXBehaviorFunctionFactory.createPerParticleFunctionsSPS(behaviors, this._valueParser);
			vfxSPS.setPerParticleBehaviors(perParticleFunctions);
		}
	}
}
