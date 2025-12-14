import { Vector3, Quaternion, Matrix, Color4, SolidParticleSystem, SolidParticle, TransformNode, Mesh } from "babylonjs";
import type { VFXParticleEmitterConfig, VFXEmissionBurst } from "../types/emitterConfig";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXPerSolidParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type {
	VFXBehavior,
	VFXForceOverLifeBehavior,
	VFXColorBySpeedBehavior,
	VFXSizeBySpeedBehavior,
	VFXRotationBySpeedBehavior,
	VFXOrbitOverLifeBehavior,
} from "../types/behaviors";
import type { VFXShape } from "../types/shapes";
import type { VFXColor } from "../types/colors";
import type { VFXValue } from "../types/values";
import type { VFXRotation } from "../types/rotations";
import { VFXSolidParticleSystemEmitterFactory } from "../factories/VFXSolidParticleSystemEmitterFactory";
import { VFXValueUtils } from "../utils/valueParser";
import { VFXCapacityCalculator } from "../utils/capacityCalculator";
import { ColorGradientSystem, NumberGradientSystem } from "../utils/gradientSystem";
import { applyColorBySpeedSPS, applySizeBySpeedSPS, applyRotationBySpeedSPS, applyOrbitOverLifeSPS } from "../behaviors";

/**
 * Emission state matching three.quarks EmissionState structure
 */
interface EmissionState {
	time: number;
	waitEmiting: number;
	travelDistance: number;
	previousWorldPos?: Vector3;
	burstIndex: number;
	burstWaveIndex: number;
	burstParticleIndex: number;
	burstParticleCount: number;
	isBursting: boolean;
}

/**
 * Extended SolidParticleSystem implementing three.quarks Mesh renderMode (renderMode = 2) logic
 * This class replicates the exact behavior of three.quarks ParticleSystem with renderMode = Mesh
 */
export class VFXSolidParticleSystem extends SolidParticleSystem {
	private _emissionState: EmissionState;
	private _behaviors: VFXPerSolidParticleBehaviorFunction[];
	private _emitterFactory: VFXSolidParticleSystemEmitterFactory;
	private _parent: TransformNode | null;
	private _vfxTransform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
	private _logger: VFXLogger | null;
	private _name: string;
	private _emitEnded: boolean;

	// Gradient systems for "OverLife" behaviors (similar to ParticleSystem native gradients)
	private _colorGradients: ColorGradientSystem;
	private _sizeGradients: NumberGradientSystem;
	private _velocityGradients: NumberGradientSystem;
	private _angularSpeedGradients: NumberGradientSystem;
	private _limitVelocityGradients: NumberGradientSystem;
	private _limitVelocityDamping: number;

	// Properties moved from config
	public isLooping: boolean;
	public duration: number;
	public prewarm: boolean;
	public shape?: VFXShape;
	public startLife?: VFXValue;
	public startSpeed?: VFXValue;
	public startRotation?: VFXRotation;
	public startSize?: VFXValue;
	public startColor?: VFXColor;
	public emissionOverTime?: VFXValue;
	public emissionOverDistance?: VFXValue;
	public emissionBursts?: VFXEmissionBurst[];
	public onlyUsedByOther: boolean;
	public instancingGeometry?: string;
	public renderOrder?: number;
	public renderMode?: number;
	public rendererEmitterSettings?: Record<string, unknown>;
	public material?: string;
	public layers?: number;
	public startTileIndex?: VFXValue;
	public uTileCount?: number;
	public vTileCount?: number;
	public blendTiles?: boolean;
	public softParticles: boolean;
	public softFarFade?: number;
	public softNearFade?: number;
	public worldSpace: boolean;
	public readonly behaviorConfigs: VFXBehavior[];

	/**
	 * Get/set parent transform node
	 */
	public get parent(): TransformNode | null {
		return this._parent;
	}
	public set parent(value: TransformNode | null) {
		this._parent = value;
		if (this.mesh) {
			this.mesh.setParent(value, false, true);
		}
	}

	/**
	 * Get behavior functions (internal use)
	 */
	public get behaviors(): VFXPerSolidParticleBehaviorFunction[] {
		return this._behaviors;
	}

	/**
	 * Add color gradient (for ColorOverLife behavior)
	 */
	public addColorGradient(gradient: number, color: Color4): void {
		this._colorGradients.addGradient(gradient, color);
	}

	/**
	 * Add size gradient (for SizeOverLife behavior)
	 */
	public addSizeGradient(gradient: number, size: number): void {
		this._sizeGradients.addGradient(gradient, size);
	}

	/**
	 * Add velocity gradient (for SpeedOverLife behavior)
	 */
	public addVelocityGradient(gradient: number, velocity: number): void {
		this._velocityGradients.addGradient(gradient, velocity);
	}

	/**
	 * Add angular speed gradient (for RotationOverLife behavior)
	 */
	public addAngularSpeedGradient(gradient: number, angularSpeed: number): void {
		this._angularSpeedGradients.addGradient(gradient, angularSpeed);
	}

	/**
	 * Add limit velocity gradient (for LimitSpeedOverLife behavior)
	 */
	public addLimitVelocityGradient(gradient: number, limit: number): void {
		this._limitVelocityGradients.addGradient(gradient, limit);
	}

	/**
	 * Set limit velocity damping (for LimitSpeedOverLife behavior)
	 */
	public set limitVelocityDamping(value: number) {
		this._limitVelocityDamping = value;
	}

	public get limitVelocityDamping(): number {
		return this._limitVelocityDamping;
	}

	/**
	 * Initialize mesh for SPS (internal use)
	 * Adds the mesh as a shape and configures billboard mode
	 */
	private _initializeMesh(particleMesh: Mesh): void {
		if (!particleMesh) {
			if (this._logger) {
				this._logger.warn(`Cannot add shape to SPS: particleMesh is null`);
			}
			return;
		}

		// Calculate capacity from config
		const capacity = VFXCapacityCalculator.calculateForSolidParticleSystem(this.emissionOverTime, this.duration, this.isLooping);

		if (this._logger) {
			this._logger.log(`Adding shape to SPS: mesh name=${particleMesh.name}, hasMaterial=${!!particleMesh.material}, capacity=${capacity}`);
		}

		// Add shape to SPS
		this.addShape(particleMesh, capacity);

		// Configure billboard mode
		if (this.renderMode === 0 || this.renderMode === 1) {
			this.billboard = true;
		}

		// Dispose temporary mesh after adding to SPS
		particleMesh.dispose();
	}

	/**
	 * Get emit rate (constant value from emissionOverTime)
	 */
	public get emitRate(): number {
		if (!this.emissionOverTime) {
			return 10; // Default
		}
		return VFXValueUtils.parseConstantValue(this.emissionOverTime);
	}
	public set emitRate(value: number) {
		this.emissionOverTime = { type: "ConstantValue", value };
	}

	/**
	 * Get target stop duration (alias for duration)
	 */
	public get targetStopDuration(): number {
		return this.duration;
	}
	public set targetStopDuration(value: number) {
		this.duration = value;
	}
	private _normalMatrix: Matrix;
	private _tempVec: Vector3;
	private _tempVec2: Vector3;
	private _tempQuat: Quaternion;

	constructor(
		name: string,
		scene: any,
		initialConfig: VFXParticleEmitterConfig, // Initial config for parsing
		options?: {
			updatable?: boolean;
			isPickable?: boolean;
			enableDepthSort?: boolean;
			particleIntersection?: boolean;
			useModelMaterial?: boolean;
			parentGroup?: TransformNode | null;
			vfxTransform?: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
			logger?: VFXLogger | null;
			loaderOptions?: VFXLoaderOptions;
			particleMesh?: Mesh | null; // Pre-created mesh for initialization
		}
	) {
		super(name, scene, options);

		this._name = name;
		this._behaviors = [];
		this._emitterFactory = new VFXSolidParticleSystemEmitterFactory();

		// Initialize properties from initialConfig
		this.isLooping = initialConfig.looping !== false;
		this.duration = initialConfig.duration || 5;
		this.prewarm = initialConfig.prewarm || false;
		this.shape = initialConfig.shape;
		this.startLife = initialConfig.startLife;
		this.startSpeed = initialConfig.startSpeed;
		this.startRotation = initialConfig.startRotation;
		this.startSize = initialConfig.startSize;
		this.startColor = initialConfig.startColor;
		this.emissionOverTime = initialConfig.emissionOverTime;
		this.emissionOverDistance = initialConfig.emissionOverDistance;
		this.emissionBursts = initialConfig.emissionBursts;
		this.onlyUsedByOther = initialConfig.onlyUsedByOther || false;
		this.instancingGeometry = initialConfig.instancingGeometry;
		this.renderOrder = initialConfig.renderOrder;
		this.renderMode = initialConfig.renderMode;
		this.rendererEmitterSettings = initialConfig.rendererEmitterSettings;
		this.material = initialConfig.material;
		this.layers = initialConfig.layers;
		this.startTileIndex = initialConfig.startTileIndex;
		this.uTileCount = initialConfig.uTileCount;
		this.vTileCount = initialConfig.vTileCount;
		this.blendTiles = initialConfig.blendTiles;
		this.softParticles = initialConfig.softParticles || false;
		this.softFarFade = initialConfig.softFarFade;
		this.softNearFade = initialConfig.softNearFade;
		this.worldSpace = initialConfig.worldSpace || false;

		// Initialize gradient systems
		this._colorGradients = new ColorGradientSystem();
		this._sizeGradients = new NumberGradientSystem();
		this._velocityGradients = new NumberGradientSystem();
		this._angularSpeedGradients = new NumberGradientSystem();
		this._limitVelocityGradients = new NumberGradientSystem();
		this._limitVelocityDamping = 0.1;

		// Create proxy array for behavior configs
		this.behaviorConfigs = this._createBehaviorConfigsProxy(initialConfig.behaviors || []);

		// Initialize behavior functions from config
		this._updateBehaviorFunctions();

		this._parent = options?.parentGroup ?? null;
		this._vfxTransform = options?.vfxTransform ?? null;
		this._logger = options?.logger ?? null;
		this._emitEnded = false;
		this._normalMatrix = new Matrix();
		this._tempVec = Vector3.Zero();
		this._tempVec2 = Vector3.Zero();
		this._tempQuat = Quaternion.Identity();

		this.updateParticle = this._updateParticle.bind(this);

		this._emissionState = {
			time: 0,
			waitEmiting: 0,
			travelDistance: 0,
			burstIndex: 0,
			burstWaveIndex: 0,
			burstParticleIndex: 0,
			burstParticleCount: 0,
			isBursting: false,
		};

		// Initialize mesh if provided
		if (options?.particleMesh) {
			this._initializeMesh(options.particleMesh);
		}
	}

	private _findDeadParticle(): SolidParticle | null {
		for (let j = 0; j < this.nbParticles; j++) {
			if (!this.particles[j].alive) {
				return this.particles[j];
			}
		}
		return null;
	}

	private _resetParticle(particle: SolidParticle): void {
		particle.age = 0;
		particle.alive = true;
		particle.isVisible = true;
		particle.position.setAll(0);
		particle.velocity.setAll(0);
		particle.rotation.setAll(0);
		particle.scaling.setAll(1);
		if (particle.color) {
			particle.color.set(1, 1, 1, 1);
		} else {
			particle.color = new Color4(1, 1, 1, 1);
		}

		if (!particle.props) {
			particle.props = {};
		}
		particle.props.speedModifier = 1.0;
	}

	private _initializeParticleColor(particle: SolidParticle): void {
		if (!particle.color) {
			particle.color = new Color4(1, 1, 1, 1);
		}

		if (this.startColor !== undefined) {
			const startColor = VFXValueUtils.parseConstantColor(this.startColor);
			particle.props!.startColor = startColor.clone();
			particle.color.copyFrom(startColor);
		} else {
			const defaultColor = new Color4(1, 1, 1, 1);
			particle.props!.startColor = defaultColor.clone();
			particle.color.copyFrom(defaultColor);
		}
	}

	private _initializeParticleSpeed(particle: SolidParticle): void {
		if (this.startSpeed !== undefined) {
			const normalizedTime = this._emissionState.time / this.duration;
			particle.props!.startSpeed = VFXValueUtils.parseValue(this.startSpeed, normalizedTime);
		} else {
			particle.props!.startSpeed = 0;
		}
	}

	private _initializeParticleLife(particle: SolidParticle): void {
		if (this.startLife !== undefined) {
			const normalizedTime = this._emissionState.time / this.duration;
			particle.lifeTime = VFXValueUtils.parseValue(this.startLife, normalizedTime);
		} else {
			particle.lifeTime = 1;
		}
	}

	private _initializeParticleSize(particle: SolidParticle): void {
		if (this.startSize !== undefined) {
			const normalizedTime = this._emissionState.time / this.duration;
			const sizeValue = VFXValueUtils.parseValue(this.startSize, normalizedTime);
			particle.props!.startSize = sizeValue;
			particle.scaling.setAll(sizeValue);
		} else {
			particle.props!.startSize = 1;
			particle.scaling.setAll(1);
		}
	}

	private _spawn(count: number): void {
		const emissionState = this._emissionState;

		const emitterMatrix = this._getEmitterMatrix();
		const translation = this._tempVec;
		const quaternion = this._tempQuat;
		const scale = this._tempVec2;
		emitterMatrix.decompose(scale, quaternion, translation);
		emitterMatrix.toNormalMatrix(this._normalMatrix);

		for (let i = 0; i < count; i++) {
			emissionState.burstParticleIndex = i;

			const particle = this._findDeadParticle();
			if (!particle) {
				continue;
			}

			this._resetParticle(particle);
			this._initializeParticleColor(particle);
			this._initializeParticleSpeed(particle);
			this._initializeParticleLife(particle);
			this._initializeParticleSize(particle);

			this._initializeEmitterShape(particle);
		}
	}

	/**
	 * Initialize emitter shape for particle using factory
	 */
	private _initializeEmitterShape(particle: SolidParticle): void {
		const startSpeed = particle.props?.startSpeed ?? 0;
		this._emitterFactory.initializeParticle(particle, this.shape, startSpeed);
	}

	private _getEmitterMatrix(): Matrix {
		const matrix = Matrix.Identity();
		if (this.mesh) {
			this.mesh.computeWorldMatrix(true);
			matrix.copyFrom(this.mesh.getWorldMatrix());
		}
		return matrix;
	}

	private _handleEmissionLooping(): void {
		const emissionState = this._emissionState;

		if (emissionState.time > this.duration) {
			if (this.isLooping) {
				emissionState.time -= this.duration;
				emissionState.burstIndex = 0;
			} else if (!this._emitEnded) {
				this._emitEnded = true;
			}
		}
	}

	private _spawnFromWaitEmiting(): void {
		const emissionState = this._emissionState;
		const totalSpawn = Math.ceil(emissionState.waitEmiting);
		if (totalSpawn > 0) {
			this._spawn(totalSpawn);
			emissionState.waitEmiting -= totalSpawn;
		}
	}

	private _spawnBursts(): void {
		const emissionState = this._emissionState;

		if (!this.emissionBursts || !Array.isArray(this.emissionBursts)) {
			return;
		}

		while (emissionState.burstIndex < this.emissionBursts.length && this._getBurstTime(this.emissionBursts[emissionState.burstIndex]) <= emissionState.time) {
			const burst = this.emissionBursts[emissionState.burstIndex];
			const burstCount = VFXValueUtils.parseConstantValue(burst.count);
			emissionState.isBursting = true;
			emissionState.burstParticleCount = burstCount;
			this._spawn(burstCount);
			emissionState.isBursting = false;
			emissionState.burstIndex++;
		}
	}

	private _accumulateEmission(delta: number): void {
		const emissionState = this._emissionState;

		if (this._emitEnded) {
			return;
		}

		const emissionRate = this.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(this.emissionOverTime) : 10;
		emissionState.waitEmiting += delta * emissionRate;

		if (this.emissionOverDistance !== undefined && this.mesh && this.mesh.position) {
			const emitPerMeter = VFXValueUtils.parseConstantValue(this.emissionOverDistance);
			if (emitPerMeter > 0 && emissionState.previousWorldPos) {
				const distance = Vector3.Distance(emissionState.previousWorldPos, this.mesh.position);
				emissionState.travelDistance += distance;
				if (emissionState.travelDistance * emitPerMeter > 0) {
					const count = Math.floor(emissionState.travelDistance * emitPerMeter);
					emissionState.travelDistance -= count / emitPerMeter;
					emissionState.waitEmiting += count;
				}
			}
			if (!emissionState.previousWorldPos) {
				emissionState.previousWorldPos = Vector3.Zero();
			}
			emissionState.previousWorldPos.copyFrom(this.mesh.position);
		}
	}

	private _emit(delta: number): void {
		this._handleEmissionLooping();
		this._spawnFromWaitEmiting();
		this._spawnBursts();
		this._accumulateEmission(delta);

		this._emissionState.time += delta;
	}

	private _getBurstTime(burst: VFXEmissionBurst): number {
		return VFXValueUtils.parseConstantValue(burst.time);
	}

	private _setupMeshProperties(): void {
		if (!this.mesh) {
			if (this._logger) {
				this._logger.warn(`  SPS mesh is null in initParticles!`);
			}
			return;
		}

		if (this._logger) {
			this._logger.log(`  initParticles called for SPS: ${this._name}`);
			this._logger.log(`  SPS mesh exists: ${this.mesh.name}`);
		}

		if (this.renderOrder !== undefined) {
			this.mesh.renderingGroupId = this.renderOrder;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh renderingGroupId: ${this.renderOrder}`);
			}
		}

		if (this.layers !== undefined) {
			this.mesh.layerMask = this.layers;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh layerMask: ${this.layers}`);
			}
		}

		if (this._parent) {
			this.mesh.setParent(this._parent, false, true);
			if (this._logger) {
				this._logger.log(`  Set SPS mesh parent to: ${this._parent.name}`);
			}
		} else if (this._logger) {
			this._logger.log(`  No parent group to set for SPS mesh`);
		}

		if (this._vfxTransform) {
			this.mesh.position.copyFrom(this._vfxTransform.position);
			this.mesh.rotationQuaternion = this._vfxTransform.rotation.clone();
			this.mesh.scaling.copyFrom(this._vfxTransform.scale);

			if (this._logger) {
				const rot = this.mesh.rotationQuaternion;
				this._logger.log(
					`  Applied VFX transform to SPS mesh: pos=(${this._vfxTransform.position.x.toFixed(2)}, ${this._vfxTransform.position.y.toFixed(2)}, ${this._vfxTransform.position.z.toFixed(2)}), rot=(${rot ? rot.x.toFixed(4) : 0}, ${rot ? rot.y.toFixed(4) : 0}, ${rot ? rot.z.toFixed(4) : 0}, ${rot ? rot.w.toFixed(4) : 1}), scale=(${this._vfxTransform.scale.x.toFixed(2)}, ${this._vfxTransform.scale.y.toFixed(2)}, ${this._vfxTransform.scale.z.toFixed(2)})`
				);
			}
		} else if (this._logger) {
			this._logger.log(`  No VFX transform to apply to SPS mesh`);
		}
	}

	private _initializeDeadParticles(): void {
		for (let i = 0; i < this.nbParticles; i++) {
			const particle = this.particles[i];
			particle.alive = false;
			particle.isVisible = false;
			particle.age = 0;
			particle.lifeTime = Infinity;
			particle.position.setAll(0);
			particle.velocity.setAll(0);
			particle.rotation.setAll(0);
			particle.scaling.setAll(1);
			if (particle.color) {
				particle.color.set(1, 1, 1, 1);
			} else {
				particle.color = new Color4(1, 1, 1, 1);
			}
		}
	}

	private _resetEmissionState(): void {
		this._emissionState.time = 0;
		this._emissionState.waitEmiting = 0;
		this._emissionState.travelDistance = 0;
		this._emissionState.burstIndex = 0;
		this._emissionState.burstWaveIndex = 0;
		this._emissionState.burstParticleIndex = 0;
		this._emissionState.burstParticleCount = 0;
		this._emissionState.isBursting = false;
		if (this.mesh && this.mesh.position) {
			this._emissionState.previousWorldPos = this.mesh.position.clone();
		}
		this._emitEnded = false;
	}

	public override initParticles(): void {
		this._setupMeshProperties();
		this._initializeDeadParticles();
		this._resetEmissionState();
	}

	/**
	 * Create a proxy array that automatically updates behavior functions when configs change
	 */
	private _createBehaviorConfigsProxy(configs: VFXBehavior[]): VFXBehavior[] {
		const self = this;

		// Wrap each behavior object in a proxy to detect property changes
		const wrapBehavior = (behavior: VFXBehavior): VFXBehavior => {
			return new Proxy(behavior, {
				set(target, prop, value) {
					const result = Reflect.set(target, prop, value);
					// When a behavior property changes, update functions
					self._updateBehaviorFunctions();
					return result;
				},
			});
		};

		// Wrap all initial behaviors
		const wrappedConfigs = configs.map(wrapBehavior);

		return new Proxy(wrappedConfigs, {
			set(target, property, value) {
				const result = Reflect.set(target, property, value);

				// Update functions when array is modified
				if (property === "length" || typeof property === "number") {
					// If setting an element, wrap it in proxy
					if (typeof property === "number" && value && typeof value === "object") {
						Reflect.set(target, property, wrapBehavior(value as VFXBehavior));
					}
					self._updateBehaviorFunctions();
				}

				return result;
			},

			get(target, property) {
				const value = Reflect.get(target, property);

				// Intercept array methods that modify the array
				if (
					typeof value === "function" &&
					(property === "push" ||
						property === "pop" ||
						property === "splice" ||
						property === "shift" ||
						property === "unshift" ||
						property === "sort" ||
						property === "reverse")
				) {
					return function (...args: any[]) {
						const result = value.apply(target, args);
						// Wrap any new behaviors added via push/unshift
						if (property === "push" || property === "unshift") {
							for (let i = 0; i < args.length; i++) {
								if (args[i] && typeof args[i] === "object") {
									const index = property === "push" ? target.length - args.length + i : i;
									Reflect.set(target, index, wrapBehavior(args[i] as VFXBehavior));
								}
							}
						}
						self._updateBehaviorFunctions();
						return result;
					};
				}

				return value;
			},
		});
	}

	/**
	 * Update behavior functions from configs
	 * Internal method, called automatically when configs change
	 */
	/**
	 * Update behavior functions from configs
	 * Applies both system-level behaviors (gradients) and per-particle behaviors
	 */
	private _updateBehaviorFunctions(): void {
		// Clear all gradients
		this._colorGradients.clear();
		this._sizeGradients.clear();
		this._velocityGradients.clear();
		this._angularSpeedGradients.clear();
		this._limitVelocityGradients.clear();

		// Apply system-level behaviors (gradients) - these configure the system once
		this._applySystemLevelBehaviors();

		// Create per-particle behavior functions (BySpeed, OrbitOverLife, ForceOverLife, etc.)
		this._behaviors = this._createPerParticleBehaviorFunctions(this.behaviorConfigs);
	}

	/**
	 * Create per-particle behavior functions from configurations
	 * Only creates functions for behaviors that depend on particle properties (speed, orbit, force)
	 * "OverLife" behaviors are handled by gradients (system-level)
	 */
	private _createPerParticleBehaviorFunctions(behaviors: VFXBehavior[]): VFXPerSolidParticleBehaviorFunction[] {
		const functions: VFXPerSolidParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ForceOverLife":
				case "ApplyForce": {
					const b = behavior as VFXForceOverLifeBehavior;
					functions.push((particle: SolidParticle) => {
						// Get updateSpeed from system (stored in particle.props or use default)
						const updateSpeed = (particle as any).system?.updateSpeed ?? 0.016;

						const forceX = b.x ?? b.force?.x;
						const forceY = b.y ?? b.force?.y;
						const forceZ = b.z ?? b.force?.z;
						if (forceX !== undefined || forceY !== undefined || forceZ !== undefined) {
							const fx = forceX !== undefined ? VFXValueUtils.parseConstantValue(forceX) : 0;
							const fy = forceY !== undefined ? VFXValueUtils.parseConstantValue(forceY) : 0;
							const fz = forceZ !== undefined ? VFXValueUtils.parseConstantValue(forceZ) : 0;
							particle.velocity.x += fx * updateSpeed;
							particle.velocity.y += fy * updateSpeed;
							particle.velocity.z += fz * updateSpeed;
						}
					});
					break;
				}

				case "ColorBySpeed": {
					const b = behavior as VFXColorBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applyColorBySpeedSPS(particle, b);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as VFXSizeBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applySizeBySpeedSPS(particle, b);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as VFXRotationBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applyRotationBySpeedSPS(particle, b);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as VFXOrbitOverLifeBehavior;
					functions.push((particle: SolidParticle) => {
						applyOrbitOverLifeSPS(particle, b);
					});
					break;
				}
			}
		}

		return functions;
	}

	/**
	 * Apply system-level behaviors (gradients) to SolidParticleSystem
	 * These are applied once when behaviors change, not per-particle
	 * Similar to ParticleSystem native gradients
	 */
	private _applySystemLevelBehaviors(): void {
		// Import behaviors dynamically to avoid circular dependencies
		const behaviors = require("../behaviors");
		const applyColorOverLifeSPS = behaviors.applyColorOverLifeSPS;
		const applySizeOverLifeSPS = behaviors.applySizeOverLifeSPS;
		const applyRotationOverLifeSPS = behaviors.applyRotationOverLifeSPS;
		const applySpeedOverLifeSPS = behaviors.applySpeedOverLifeSPS;
		const applyLimitSpeedOverLifeSPS = behaviors.applyLimitSpeedOverLifeSPS;

		for (const behavior of this.behaviorConfigs) {
			if (!behavior.type) {
				continue;
			}

			switch (behavior.type) {
				case "ColorOverLife":
					applyColorOverLifeSPS(this, behavior as any);
					break;
				case "SizeOverLife":
					applySizeOverLifeSPS(this, behavior as any);
					break;
				case "RotationOverLife":
				case "Rotation3DOverLife":
					applyRotationOverLifeSPS(this, behavior as any);
					break;
				case "SpeedOverLife":
					applySpeedOverLifeSPS(this, behavior as any);
					break;
				case "LimitSpeedOverLife":
					applyLimitSpeedOverLifeSPS(this, behavior as any);
					break;
			}
		}
	}

	public override beforeUpdateParticles(start?: number, stop?: number, update?: boolean): void {
		super.beforeUpdateParticles(start, stop, update);

		if (!this._started || this._stopped) {
			return;
		}

		const deltaTime = this._scaledUpdateSpeed || 0.016;

		this._emit(deltaTime);
		this._emissionState.time += deltaTime;
	}

	private _updateParticle(particle: SolidParticle): SolidParticle {
		if (!particle.alive) {
			particle.isVisible = false;

			if (this._positions32 && particle._model) {
				const shape = particle._model._shape;
				const startIdx = particle._pos;
				for (let pt = 0; pt < shape.length; pt++) {
					const idx = startIdx + pt * 3;
					this._positions32[idx] = 0;
					this._positions32[idx + 1] = 0;
					this._positions32[idx + 2] = 0;
				}
			}

			return particle;
		}

		if (particle.age < 0) {
			return particle;
		}

		// Calculate lifeRatio for gradient interpolation
		const lifeRatio = particle.lifeTime > 0 ? particle.age / particle.lifeTime : 0;

		// Apply "OverLife" gradients (similar to ParticleSystem native gradients)
		this._applyGradients(particle, lifeRatio);

		// Store reference to system in particle for behaviors that need it
		(particle as any).system = this;

		// Apply per-particle behaviors (BySpeed, OrbitOverLife, etc.)
		// These behaviors don't use gradients as they depend on particle properties, not lifeRatio
		// Behavior config is captured in closure, so we only need to pass particle
		for (const behaviorFn of this._behaviors) {
			behaviorFn(particle);
		}

		// Apply velocity with speed modifier
		const speedModifier = particle.props?.speedModifier ?? 1.0;
		particle.position.addInPlace(particle.velocity.scale(this.updateSpeed * speedModifier));

		return particle;
	}

	/**
	 * Apply gradients to particle based on lifeRatio
	 */
	private _applyGradients(particle: SolidParticle, lifeRatio: number): void {
		// Apply color gradient
		const color = this._colorGradients.getValue(lifeRatio);
		if (color && particle.color) {
			const startColor = particle.props?.startColor;
			if (startColor) {
				// Multiply with startColor (matching ParticleSystem behavior)
				particle.color.r = color.r * startColor.r;
				particle.color.g = color.g * startColor.g;
				particle.color.b = color.b * startColor.b;
				particle.color.a = color.a * startColor.a;
			} else {
				particle.color.copyFrom(color);
			}
		}

		// Apply size gradient
		const size = this._sizeGradients.getValue(lifeRatio);
		if (size !== null && particle.props?.startSize !== undefined) {
			const newSize = particle.props.startSize * size;
			particle.scaling.setAll(newSize);
		}

		// Apply velocity gradient (speed modifier)
		const velocity = this._velocityGradients.getValue(lifeRatio);
		if (velocity !== null) {
			particle.props = particle.props || {};
			particle.props.speedModifier = velocity;
		}

		// Apply angular speed gradient
		const angularSpeed = this._angularSpeedGradients.getValue(lifeRatio);
		if (angularSpeed !== null) {
			particle.rotation.z += angularSpeed * this.updateSpeed;
		}

		// Apply limit velocity
		const limitVelocity = this._limitVelocityGradients.getValue(lifeRatio);
		if (limitVelocity !== null && this._limitVelocityDamping > 0) {
			const currentSpeed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y + particle.velocity.z * particle.velocity.z);
			if (currentSpeed > limitVelocity) {
				const scale = limitVelocity / currentSpeed;
				particle.velocity.scaleInPlace(scale * this._limitVelocityDamping);
			}
		}
	}
}
