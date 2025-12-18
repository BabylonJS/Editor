import { Vector3, Quaternion, Matrix, Color4, SolidParticle, TransformNode, Mesh, AbstractMesh, SolidParticleSystem } from "babylonjs";
import type {
	Behavior,
	IForceOverLifeBehavior,
	IColorBySpeedBehavior,
	ISizeBySpeedBehavior,
	IRotationBySpeedBehavior,
	IOrbitOverLifeBehavior,
	IEmissionBurst,
	ISolidParticleEmitterType,
	PerSolidParticleBehaviorFunction,
	ISystem,
	SolidParticleWithSystem,
	Value,
} from "../types";
import { SolidPointParticleEmitter, SolidSphereParticleEmitter, SolidConeParticleEmitter } from "../emitters";
import { ValueUtils, CapacityCalculator, ColorGradientSystem, NumberGradientSystem } from "../utils";
import {
	applyColorBySpeedSPS,
	applySizeBySpeedSPS,
	applyRotationBySpeedSPS,
	applyOrbitOverLifeSPS,
	applyColorOverLifeSPS,
	applyLimitSpeedOverLifeSPS,
	applyRotationOverLifeSPS,
	applySizeOverLifeSPS,
	applySpeedOverLifeSPS,
} from "../behaviors";

/**
 * Emission state matching three.quarks EmissionState structure
 */
interface IEmissionState {
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
 * Extended SolidParticleSystem implementing three.quarks Mesh systemType (systemType = "solid") logic
 * This class replicates the exact behavior of three.quarks ParticleSystem with systemType = "solid"
 */
export class EffectSolidParticleSystem extends SolidParticleSystem implements ISystem {
	private _emissionState: IEmissionState;
	private _behaviors: PerSolidParticleBehaviorFunction[];
	public particleEmitterType: ISolidParticleEmitterType | null;
	private _emitEnded: boolean;
	private _emitter: AbstractMesh | null;

	// Gradient systems for "OverLife" behaviors (similar to ParticleSystem native gradients)
	private _colorGradients: ColorGradientSystem;
	private _sizeGradients: NumberGradientSystem;
	private _velocityGradients: NumberGradientSystem;
	private _angularSpeedGradients: NumberGradientSystem;
	private _limitVelocityGradients: NumberGradientSystem;
	private _limitVelocityDamping: number;

	// === Native Babylon.js properties (like ParticleSystem) ===
	public minSize: number = 1;
	public maxSize: number = 1;
	public minLifeTime: number = 1;
	public maxLifeTime: number = 1;
	public minEmitPower: number = 1;
	public maxEmitPower: number = 1;
	public emitRate: number = 10;
	public targetStopDuration: number = 5;
	public manualEmitCount: number = -1;
	public preWarmCycles: number = 0;
	public preWarmStepOffset: number = 0.016;
	public color1: Color4 = new Color4(1, 1, 1, 1);
	public color2: Color4 = new Color4(1, 1, 1, 1);
	public colorDead: Color4 = new Color4(1, 1, 1, 0);
	public minInitialRotation: number = 0;
	public maxInitialRotation: number = 0;
	public isLocal: boolean = false;
	public disposeOnStop: boolean = false;
	public gravity?: Vector3;
	public noiseStrength?: Vector3;
	public updateSpeed: number = 1;
	public minAngularSpeed: number = 0;
	public maxAngularSpeed: number = 0;
	public minScaleX: number = 1;
	public maxScaleX: number = 1;
	public minScaleY: number = 1;
	public maxScaleY: number = 1;

	// Gradients for PiecewiseBezier (like ParticleSystem)
	private _startSizeGradients: NumberGradientSystem;
	private _lifeTimeGradients: NumberGradientSystem;
	private _emitRateGradients: NumberGradientSystem;

	// === Other properties ===
	public emissionOverDistance?: Value; // For distance-based emission
	public emissionBursts?: IEmissionBurst[]; // Legacy: converted to gradients in Factory
	public renderOrder?: number;
	public layers?: number;
	public isBillboardBased?: boolean;
	private _behaviorConfigs: Behavior[];

	/**
	 * Get current behavior configurations
	 */
	public get behaviorConfigs(): Behavior[] {
		return this._behaviorConfigs;
	}

	/**
	 * Set behaviors and apply them to the system
	 */
	public setBehaviors(behaviors: Behavior[]): void {
		this._behaviorConfigs = behaviors;
		this._applyBehaviors();
	}

	/**
	 * Add a single behavior
	 */
	public addBehavior(behavior: Behavior): void {
		this._behaviorConfigs.push(behavior);
		this._applyBehaviors();
	}

	/**
	 * Apply behaviors - system-level (gradients) and per-particle
	 */
	private _applyBehaviors(): void {
		// Clear existing gradients
		this._colorGradients.clear();
		this._sizeGradients.clear();
		this._velocityGradients.clear();
		this._angularSpeedGradients.clear();
		this._limitVelocityGradients.clear();

		// Apply system-level behaviors (gradients)
		this._applySystemLevelBehaviors();

		// Build per-particle behavior functions
		this._behaviors = this._buildPerParticleBehaviors(this._behaviorConfigs);
	}

	/**
	 * Add start size gradient (like ParticleSystem)
	 */
	public addStartSizeGradient(gradient: number, factor: number, factor2?: number): void {
		if (factor2 !== undefined) {
			this._startSizeGradients.addGradient(gradient, factor);
			this._startSizeGradients.addGradient(gradient, factor2);
		} else {
			this._startSizeGradients.addGradient(gradient, factor);
		}
	}

	/**
	 * Add life time gradient (like ParticleSystem)
	 */
	public addLifeTimeGradient(gradient: number, factor: number, factor2?: number): void {
		if (factor2 !== undefined) {
			this._lifeTimeGradients.addGradient(gradient, factor);
			this._lifeTimeGradients.addGradient(gradient, factor2);
		} else {
			this._lifeTimeGradients.addGradient(gradient, factor);
		}
	}

	/**
	 * Add emit rate gradient (like ParticleSystem)
	 */
	public addEmitRateGradient(gradient: number, factor: number, factor2?: number): void {
		if (factor2 !== undefined) {
			this._emitRateGradients.addGradient(gradient, factor);
			this._emitRateGradients.addGradient(gradient, factor2);
		} else {
			this._emitRateGradients.addGradient(gradient, factor);
		}
	}

	/**
	 * Get the parent node (mesh) for hierarchy operations
	 * Implements ISystem interface
	 */
	public getParentNode(): AbstractMesh | TransformNode | null {
		return this.mesh || null;
	}

	/**
	 * Emitter property (like ParticleSystem)
	 * Sets the parent for the mesh - the point from which particles emit
	 */
	public get emitter(): AbstractMesh | null {
		return this._emitter;
	}
	public set emitter(value: AbstractMesh | null) {
		this._emitter = value;
		// If mesh is already created, set its parent
		if (this.mesh && value) {
			this.mesh.setParent(value, false, true);
		}
	}

	/**
	 * Set particle mesh to use for rendering
	 * Initializes the SPS with this mesh
	 */
	public set particleMesh(mesh: Mesh) {
		this._initializeMesh(mesh);
	}

	/**
	 * Start the particle system
	 * Overrides base class to ensure proper initialization
	 */
	public override start(delay = 0): void {
		// Call base class start
		super.start(delay);

		// Reset emission state when starting
		if (delay === 0) {
			this._emissionState.time = 0;
			this._emissionState.waitEmiting = 0;
			this._emissionState.travelDistance = 0;
			this._emissionState.burstIndex = 0;
			this._emissionState.burstWaveIndex = 0;
			this._emissionState.burstParticleIndex = 0;
			this._emissionState.burstParticleCount = 0;
			this._emissionState.isBursting = false;
			this._emitEnded = false;

			// Ensure particles are visible when starting (they will be updated by setParticles)
			// Note: New particles will be spawned and visible automatically
		}
	}

	/**
	 * Stop the particle system
	 * Overrides base class to hide all particles when stopped
	 */
	public override stop(): void {
		// Hide all particles before stopping
		const particles = this.particles;
		const nbParticles = this.nbParticles;
		for (let i = 0; i < nbParticles; i++) {
			const particle = particles[i];
			if (particle.alive) {
				particle.isVisible = false;
			}
		}

		// Update particles to apply visibility changes
		this.setParticles();

		// Call base class stop
		super.stop();
	}

	/**
	 * Reset the particle system (stop and clear all particles)
	 * Stops emission, resets emission state, and rebuilds particles to initial state
	 */
	public reset(): void {
		// Stop the system if it's running
		this.stop();

		// Reset emission state
		this._emissionState.time = 0;
		this._emissionState.waitEmiting = 0;
		this._emissionState.travelDistance = 0;
		this._emissionState.burstIndex = 0;
		this._emissionState.burstWaveIndex = 0;
		this._emissionState.burstParticleIndex = 0;
		this._emissionState.burstParticleCount = 0;
		this._emissionState.isBursting = false;
		this._emitEnded = false;

		// Rebuild mesh to reset all particles to initial state (reset=true)
		this.rebuildMesh(true);
	}

	/**
	 * Get behavior functions (internal use)
	 */
	public get behaviors(): PerSolidParticleBehaviorFunction[] {
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
			return;
		}

		const isLooping = this.targetStopDuration === 0;
		const capacity = CapacityCalculator.calculateForSolidParticleSystem(this.emitRate, this.targetStopDuration, isLooping);
		this.addShape(particleMesh, capacity);

		if (this.isBillboardBased !== undefined) {
			this.billboard = this.isBillboardBased;
		} else {
			this.billboard = false;
		}

		this.buildMesh();
		this._setupMeshProperties();
		particleMesh.dispose();
	}

	private _normalMatrix: Matrix;
	private _tempVec: Vector3;
	private _tempVec2: Vector3;
	private _tempQuat: Quaternion;

	constructor(
		name: string,
		scene: any,
		options?: {
			updatable?: boolean;
			isPickable?: boolean;
			enableDepthSort?: boolean;
			particleIntersection?: boolean;
			useModelMaterial?: boolean;
		}
	) {
		super(name, scene, options);

		this.name = name;
		this._behaviors = [];
		this.particleEmitterType = null;
		this._emitter = null;

		// Gradient systems for "OverLife" behaviors
		this._colorGradients = new ColorGradientSystem();
		this._sizeGradients = new NumberGradientSystem();
		this._velocityGradients = new NumberGradientSystem();
		this._angularSpeedGradients = new NumberGradientSystem();
		this._limitVelocityGradients = new NumberGradientSystem();
		this._limitVelocityDamping = 0.1;

		// Gradients for PiecewiseBezier (like ParticleSystem)
		this._startSizeGradients = new NumberGradientSystem();
		this._lifeTimeGradients = new NumberGradientSystem();
		this._emitRateGradients = new NumberGradientSystem();

		this._behaviorConfigs = [];
		this._behaviors = [];

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
	}

	/**
	 * Find a dead particle for recycling
	 */
	private _findDeadParticle(): SolidParticle | null {
		const particles = this.particles;
		const nbParticles = this.nbParticles;
		for (let j = 0; j < nbParticles; j++) {
			if (!particles[j].alive) {
				return particles[j];
			}
		}
		return null;
	}

	/**
	 * Reset particle to initial state for recycling
	 */
	private _resetParticle(particle: SolidParticle): void {
		particle.age = 0;
		particle.alive = true;
		particle.isVisible = true;
		particle._stillInvisible = false;
		particle.position.setAll(0);
		particle.velocity.setAll(0);
		particle.rotation.setAll(0);
		particle.scaling.setAll(1);

		if (particle.color) {
			particle.color.set(1, 1, 1, 1);
		} else {
			particle.color = new Color4(1, 1, 1, 1);
		}

		const props = (particle.props ||= {});
		props.speedModifier = 1.0;
	}

	/**
	 * Initialize particle color
	 */
	private _initializeParticleColor(particle: SolidParticle): void {
		const props = particle.props!;
		props.startColor = this.color1.clone();
		if (particle.color) {
			particle.color.copyFrom(this.color1);
		} else {
			particle.color = this.color1.clone();
		}
	}

	/**
	 * Initialize particle speed
	 */
	private _initializeParticleSpeed(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		// Use min/max or gradient
		let speedValue: number;
		const emitRateGradients = this._emitRateGradients.getGradients();
		if (emitRateGradients.length > 0 && this.targetStopDuration > 0) {
			const ratio = Math.max(0, Math.min(1, normalizedTime));
			const gradientValue = this._emitRateGradients.getValue(ratio);
			if (gradientValue !== null) {
				speedValue = gradientValue;
			} else {
				speedValue = this._randomRange(this.minEmitPower, this.maxEmitPower);
			}
		} else {
			speedValue = this._randomRange(this.minEmitPower, this.maxEmitPower);
		}
		props.startSpeed = speedValue;
	}

	/**
	 * Initialize particle lifetime
	 */
	private _initializeParticleLife(particle: SolidParticle, normalizedTime: number): void {
		// Use min/max or gradient
		const lifeTimeGradients = this._lifeTimeGradients.getGradients();
		if (lifeTimeGradients.length > 0 && this.targetStopDuration > 0) {
			const ratio = Math.max(0, Math.min(1, normalizedTime));
			const gradientValue = this._lifeTimeGradients.getValue(ratio);
			if (gradientValue !== null) {
				particle.lifeTime = gradientValue;
				return;
			}
		}
		particle.lifeTime = this._randomRange(this.minLifeTime, this.maxLifeTime);
	}

	/**
	 * Initialize particle size
	 */
	private _initializeParticleSize(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		// Use min/max or gradient
		let sizeValue: number;
		const startSizeGradients = this._startSizeGradients.getGradients();
		if (startSizeGradients.length > 0 && this.targetStopDuration > 0) {
			const ratio = Math.max(0, Math.min(1, normalizedTime));
			const gradientValue = this._startSizeGradients.getValue(ratio);
			if (gradientValue !== null) {
				sizeValue = gradientValue;
			} else {
				sizeValue = this._randomRange(this.minSize, this.maxSize);
			}
		} else {
			sizeValue = this._randomRange(this.minSize, this.maxSize);
		}
		props.startSize = sizeValue;
		particle.scaling.setAll(sizeValue);
	}

	/**
	 * Random range helper
	 */
	private _randomRange(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}

	/**
	 * Initialize particle rotation
	 * Uses minInitialRotation/maxInitialRotation (like ParticleSystem)
	 */
	private _initializeParticleRotation(particle: SolidParticle, _normalizedTime: number): void {
		const angleZ = this._randomRange(this.minInitialRotation, this.maxInitialRotation);
		particle.rotation.set(0, 0, angleZ);
	}

	/**
	 * Spawn particles from dead pool
	 */
	private _spawn(count: number): void {
		if (count <= 0) {
			return;
		}

		const emissionState = this._emissionState;

		const emitterMatrix = this._getEmitterMatrix();
		const translation = this._tempVec;
		const quaternion = this._tempQuat;
		const scale = this._tempVec2;
		emitterMatrix.decompose(scale, quaternion, translation);
		emitterMatrix.toNormalMatrix(this._normalMatrix);

		const normalizedTime = this.targetStopDuration > 0 ? this._emissionState.time / this.targetStopDuration : 0;

		for (let i = 0; i < count; i++) {
			emissionState.burstParticleIndex = i;

			const particle = this._findDeadParticle();
			if (!particle) {
				break;
			}

			this._resetParticle(particle);
			this._initializeParticleColor(particle);
			this._initializeParticleSpeed(particle, normalizedTime);
			this._initializeParticleLife(particle, normalizedTime);
			this._initializeParticleSize(particle, normalizedTime);
			this._initializeParticleRotation(particle, normalizedTime);
			this._initializeEmitterShape(particle);
		}
	}

	/**
	 * Initialize emitter shape for particle using particleEmitterType
	 */
	private _initializeEmitterShape(particle: SolidParticle): void {
		const startSpeed = particle.props?.startSpeed ?? 0;
		if (this.particleEmitterType) {
			this.particleEmitterType.initializeParticle(particle, startSpeed);
		} else {
			particle.position.setAll(0);
			particle.velocity.set(0, 1, 0);
			particle.velocity.scaleInPlace(startSpeed);
		}
	}

	/**
	 * Create point emitter for SolidParticleSystem
	 */
	public createPointEmitter(): SolidPointParticleEmitter {
		const emitter = new SolidPointParticleEmitter();
		this.particleEmitterType = emitter;
		return emitter;
	}

	/**
	 * Create sphere emitter for SolidParticleSystem
	 */
	public createSphereEmitter(radius: number = 1, arc: number = Math.PI * 2, thickness: number = 1): SolidSphereParticleEmitter {
		const emitter = new SolidSphereParticleEmitter(radius, arc, thickness);
		this.particleEmitterType = emitter;
		return emitter;
	}

	/**
	 * Create cone emitter for SolidParticleSystem
	 */
	public createConeEmitter(radius: number = 1, arc: number = Math.PI * 2, thickness: number = 1, angle: number = Math.PI / 6): SolidConeParticleEmitter {
		const emitter = new SolidConeParticleEmitter(radius, arc, thickness, angle);
		this.particleEmitterType = emitter;
		return emitter;
	}

	/**
	 * Configure emitter from shape config
	 * This replaces the need for EmitterFactory
	 */
	public configureEmitterFromShape(shape: any): void {
		if (!shape || !shape.type) {
			this.createPointEmitter();
			return;
		}

		const shapeType = shape.type.toLowerCase();
		const radius = shape.radius ?? 1;
		const arc = shape.arc ?? Math.PI * 2;
		const thickness = shape.thickness ?? 1;
		const angle = shape.angle ?? Math.PI / 6;

		switch (shapeType) {
			case "sphere":
				this.createSphereEmitter(radius, arc, thickness);
				break;
			case "cone":
				this.createConeEmitter(radius, arc, thickness, angle);
				break;
			case "point":
				this.createPointEmitter();
				break;
			default:
				this.createPointEmitter();
				break;
		}
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
		const isLooping = this.targetStopDuration === 0;
		const duration = isLooping ? 5 : this.targetStopDuration; // Use default 5s for looping

		if (emissionState.time > duration) {
			if (isLooping) {
				// Loop: reset time and burst index
				emissionState.time -= duration;
				emissionState.burstIndex = 0;
			} else if (!this._emitEnded) {
				// Not looping: end emission
				this._emitEnded = true;
			}
		}
	}

	private _spawnFromWaitEmiting(): void {
		const emissionState = this._emissionState;
		const totalSpawn = Math.floor(emissionState.waitEmiting);
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
			const burstCount = ValueUtils.parseConstantValue(burst.count);
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

		// Get emit rate (use gradient if available)
		let emissionRate = this.emitRate;
		const emitRateGradients = this._emitRateGradients.getGradients();
		if (emitRateGradients.length > 0 && this.targetStopDuration > 0) {
			const normalizedTime = this.targetStopDuration > 0 ? this._emissionState.time / this.targetStopDuration : 0;
			const ratio = Math.max(0, Math.min(1, normalizedTime));
			const gradientValue = this._emitRateGradients.getValue(ratio);
			if (gradientValue !== null) {
				emissionRate = gradientValue;
			}
		}
		emissionState.waitEmiting += delta * emissionRate;

		if (this.emissionOverDistance !== undefined && this.mesh && this.mesh.position) {
			const emitPerMeter = ValueUtils.parseConstantValue(this.emissionOverDistance);
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
		this._accumulateEmission(delta);
		this._spawnFromWaitEmiting();
		this._spawnBursts();
	}

	private _getBurstTime(burst: IEmissionBurst): number {
		return ValueUtils.parseConstantValue(burst.time);
	}

	/**
	 * Override buildMesh to enable vertex colors and alpha
	 * This is required for ColorOverLife behavior to work visually
	 */
	public override buildMesh(): Mesh {
		const mesh = super.buildMesh();

		if (mesh) {
			mesh.hasVertexAlpha = true;
		}

		return mesh;
	}

	private _setupMeshProperties(): void {
		if (!this.mesh) {
			return;
		}

		if (!this.mesh.hasVertexAlpha) {
			this.mesh.hasVertexAlpha = true;
		}

		if (this.renderOrder !== undefined) {
			this.mesh.renderingGroupId = this.renderOrder;
		}

		if (this.layers !== undefined) {
			this.mesh.layerMask = this.layers;
		}

		// Emitter is the point from which particles emit (like ParticleSystem.emitter)
		if (this._emitter) {
			this.mesh.setParent(this._emitter, false, true);
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
	 * Build per-particle behavior functions from configurations
	 * Per-particle behaviors run each frame for each particle
	 * "OverLife" behaviors are handled by gradients (system-level)
	 */
	private _buildPerParticleBehaviors(behaviors: Behavior[]): PerSolidParticleBehaviorFunction[] {
		const functions: PerSolidParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ForceOverLife":
				case "ApplyForce": {
					const b = behavior as IForceOverLifeBehavior;
					functions.push((particle: SolidParticle) => {
						const particleWithSystem = particle as SolidParticleWithSystem;
						const updateSpeed = particleWithSystem.system?.updateSpeed ?? 0.016;

						const forceX = b.x ?? b.force?.x;
						const forceY = b.y ?? b.force?.y;
						const forceZ = b.z ?? b.force?.z;
						if (forceX !== undefined || forceY !== undefined || forceZ !== undefined) {
							const fx = forceX !== undefined ? ValueUtils.parseConstantValue(forceX) : 0;
							const fy = forceY !== undefined ? ValueUtils.parseConstantValue(forceY) : 0;
							const fz = forceZ !== undefined ? ValueUtils.parseConstantValue(forceZ) : 0;
							particle.velocity.x += fx * updateSpeed;
							particle.velocity.y += fy * updateSpeed;
							particle.velocity.z += fz * updateSpeed;
						}
					});
					break;
				}

				case "ColorBySpeed": {
					const b = behavior as IColorBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applyColorBySpeedSPS(particle, b);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as ISizeBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applySizeBySpeedSPS(particle, b);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as IRotationBySpeedBehavior;
					functions.push((particle: SolidParticle) => {
						applyRotationBySpeedSPS(particle, b);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as IOrbitOverLifeBehavior;
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

		if (this._stopped) {
			const particles = this.particles;
			const nbParticles = this.nbParticles;
			for (let i = 0; i < nbParticles; i++) {
				const particle = particles[i];
				if (particle.alive) {
					particle.isVisible = false;
				}
			}
			return;
		}

		if (!this._started) {
			return;
		}

		const deltaTime = this._scaledUpdateSpeed || 0.016;

		this._emissionState.time += deltaTime;

		this._emit(deltaTime);

		this._handleEmissionLooping();
	}

	private _updateParticle(particle: SolidParticle): SolidParticle {
		if (!particle.alive) {
			particle.isVisible = false;

			if (!particle._stillInvisible && this._positions32 && particle._model) {
				const shape = particle._model._shape;
				const startIdx = particle._pos;
				const positions32 = this._positions32;
				for (let pt = 0, len = shape.length; pt < len; pt++) {
					const idx = startIdx + pt * 3;
					positions32[idx] = positions32[idx + 1] = positions32[idx + 2] = 0;
				}
				particle._stillInvisible = true;
			}

			return particle;
		}

		const lifeRatio = particle.lifeTime > 0 ? particle.age / particle.lifeTime : 0;

		this._applyGradients(particle, lifeRatio);

		const particleWithSystem = particle as SolidParticleWithSystem;
		particleWithSystem.system = this;

		const behaviors = this._behaviors;
		for (let i = 0, len = behaviors.length; i < len; i++) {
			behaviors[i](particle);
		}

		const props = particle.props;
		const speedModifier = props?.speedModifier ?? 1.0;
		const updateSpeed = this.updateSpeed;
		particle.position.addInPlace(particle.velocity.scale(updateSpeed * speedModifier));

		return particle;
	}

	/**
	 * Apply gradients to particle based on lifeRatio
	 */
	private _applyGradients(particle: SolidParticle, lifeRatio: number): void {
		const props = (particle.props ||= {});
		const updateSpeed = this.updateSpeed;

		const color = this._colorGradients.getValue(lifeRatio);
		if (color && particle.color) {
			particle.color.copyFrom(color);

			const startColor = props.startColor;
			if (startColor) {
				particle.color.r *= startColor.r;
				particle.color.g *= startColor.g;
				particle.color.b *= startColor.b;
				particle.color.a *= startColor.a;
			}
		}

		const size = this._sizeGradients.getValue(lifeRatio);
		if (size !== null && props.startSize !== undefined) {
			particle.scaling.setAll(props.startSize * size);
		}

		const velocity = this._velocityGradients.getValue(lifeRatio);
		if (velocity !== null) {
			props.speedModifier = velocity;
		}

		const angularSpeed = this._angularSpeedGradients.getValue(lifeRatio);
		if (angularSpeed !== null) {
			particle.rotation.z += angularSpeed * updateSpeed;
		}

		const limitVelocity = this._limitVelocityGradients.getValue(lifeRatio);
		if (limitVelocity !== null && this._limitVelocityDamping > 0) {
			const vel = particle.velocity;
			const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
			if (currentSpeed > limitVelocity) {
				vel.scaleInPlace((limitVelocity / currentSpeed) * this._limitVelocityDamping);
			}
		}
	}
}
