import { Vector3, Quaternion, Matrix, Color4, SolidParticle, TransformNode, Mesh, AbstractMesh, SolidParticleSystem } from "babylonjs";
import type {
	Behavior,
	IForceOverLifeBehavior,
	IColorBySpeedBehavior,
	ISizeBySpeedBehavior,
	IRotationBySpeedBehavior,
	IOrbitOverLifeBehavior,
	IEmitterConfig,
	IEmissionBurst,
	ISolidParticleEmitterType,
	PerSolidParticleBehaviorFunction,
	ISystem,
	SolidParticleWithSystem,
	IShape,
	Color,
	Value,
	Rotation,
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
	private _parent: TransformNode | null;
	private _transform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
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
	public shape?: IShape;
	public startLife?: Value;
	public startSpeed?: Value;
	public startRotation?: Rotation;
	public startSize?: Value;
	public startColor?: Color;
	public emissionOverTime?: Value;
	public emissionOverDistance?: Value;
	public emissionBursts?: IEmissionBurst[];
	public onlyUsedByOther: boolean;
	public instancingGeometry?: string;
	public renderOrder?: number;
	public rendererEmitterSettings?: Record<string, unknown>;
	public material?: string;
	public layers?: number;
	public isBillboardBased?: boolean;
	public startTileIndex?: Value;
	public uTileCount?: number;
	public vTileCount?: number;
	public blendTiles?: boolean;
	public softParticles: boolean;
	public softFarFade?: number;
	public softNearFade?: number;
	public worldSpace: boolean;
	public readonly behaviorConfigs: Behavior[];

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
	 * Get/set minSize (compatible with ParticleSystem API)
	 * Works with startSize Value under the hood
	 */
	public get minSize(): number {
		if (!this.startSize) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startSize).min;
	}
	public set minSize(value: number) {
		if (!this.startSize) {
			this.startSize = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startSize === "number") {
			this.startSize = { type: "IntervalValue", min: value, max: this.startSize };
			return;
		}
		if (this.startSize.type === "ConstantValue") {
			this.startSize = { type: "IntervalValue", min: value, max: this.startSize.value };
			return;
		}
		if (this.startSize.type === "IntervalValue") {
			this.startSize.min = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startSize = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set maxSize (compatible with ParticleSystem API)
	 * Works with startSize Value under the hood
	 */
	public get maxSize(): number {
		if (!this.startSize) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startSize).max;
	}
	public set maxSize(value: number) {
		if (!this.startSize) {
			this.startSize = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startSize === "number") {
			this.startSize = { type: "IntervalValue", min: this.startSize, max: value };
			return;
		}
		if (this.startSize.type === "ConstantValue") {
			this.startSize = { type: "IntervalValue", min: this.startSize.value, max: value };
			return;
		}
		if (this.startSize.type === "IntervalValue") {
			this.startSize.max = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startSize = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set minLifeTime (compatible with ParticleSystem API)
	 * Works with startLife Value under the hood
	 */
	public get minLifeTime(): number {
		if (!this.startLife) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startLife).min;
	}
	public set minLifeTime(value: number) {
		if (!this.startLife) {
			this.startLife = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startLife === "number") {
			this.startLife = { type: "IntervalValue", min: value, max: this.startLife };
			return;
		}
		if (this.startLife.type === "ConstantValue") {
			this.startLife = { type: "IntervalValue", min: value, max: this.startLife.value };
			return;
		}
		if (this.startLife.type === "IntervalValue") {
			this.startLife.min = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startLife = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set maxLifeTime (compatible with ParticleSystem API)
	 * Works with startLife Value under the hood
	 */
	public get maxLifeTime(): number {
		if (!this.startLife) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startLife).max;
	}
	public set maxLifeTime(value: number) {
		if (!this.startLife) {
			this.startLife = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startLife === "number") {
			this.startLife = { type: "IntervalValue", min: this.startLife, max: value };
			return;
		}
		if (this.startLife.type === "ConstantValue") {
			this.startLife = { type: "IntervalValue", min: this.startLife.value, max: value };
			return;
		}
		if (this.startLife.type === "IntervalValue") {
			this.startLife.max = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startLife = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set minEmitPower (compatible with ParticleSystem API)
	 * Works with startSpeed Value under the hood
	 */
	public get minEmitPower(): number {
		if (!this.startSpeed) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startSpeed).min;
	}
	public set minEmitPower(value: number) {
		if (!this.startSpeed) {
			this.startSpeed = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startSpeed === "number") {
			this.startSpeed = { type: "IntervalValue", min: value, max: this.startSpeed };
			return;
		}
		if (this.startSpeed.type === "ConstantValue") {
			this.startSpeed = { type: "IntervalValue", min: value, max: this.startSpeed.value };
			return;
		}
		if (this.startSpeed.type === "IntervalValue") {
			this.startSpeed.min = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startSpeed = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set maxEmitPower (compatible with ParticleSystem API)
	 * Works with startSpeed Value under the hood
	 */
	public get maxEmitPower(): number {
		if (!this.startSpeed) {
			return 1;
		}
		return ValueUtils.parseIntervalValue(this.startSpeed).max;
	}
	public set maxEmitPower(value: number) {
		if (!this.startSpeed) {
			this.startSpeed = { type: "IntervalValue", min: value, max: value };
			return;
		}
		if (typeof this.startSpeed === "number") {
			this.startSpeed = { type: "IntervalValue", min: this.startSpeed, max: value };
			return;
		}
		if (this.startSpeed.type === "ConstantValue") {
			this.startSpeed = { type: "IntervalValue", min: this.startSpeed.value, max: value };
			return;
		}
		if (this.startSpeed.type === "IntervalValue") {
			this.startSpeed.max = value;
			return;
		}
		// For PiecewiseBezier, convert to IntervalValue
		this.startSpeed = { type: "IntervalValue", min: value, max: value };
	}

	/**
	 * Get/set color1 (compatible with ParticleSystem API)
	 * Works with startColor Color under the hood
	 */
	public get color1(): Color4 {
		if (!this.startColor) {
			return new Color4(1, 1, 1, 1);
		}
		return ValueUtils.parseConstantColor(this.startColor);
	}
	public set color1(value: Color4) {
		this.startColor = {
			type: "ConstantColor",
			value: [value.r, value.g, value.b, value.a],
		};
	}

	/**
	 * Get/set minInitialRotation (compatible with ParticleSystem API)
	 * Works with startRotation Rotation under the hood (uses angleZ)
	 */
	public get minInitialRotation(): number {
		if (!this.startRotation) {
			return 0;
		}
		// Handle Euler rotation with angleZ
		if (typeof this.startRotation === "object" && "type" in this.startRotation && this.startRotation.type === "Euler") {
			if (this.startRotation.angleZ) {
				return ValueUtils.parseIntervalValue(this.startRotation.angleZ).min;
			}
			return 0;
		}
		// Handle simple Value rotation
		if (typeof this.startRotation === "object" && "type" in this.startRotation) {
			return ValueUtils.parseIntervalValue(this.startRotation as any).min;
		}
		return typeof this.startRotation === "number" ? this.startRotation : 0;
	}
	public set minInitialRotation(value: number) {
		if (!this.startRotation) {
			this.startRotation = { type: "Euler", angleZ: { type: "IntervalValue", min: value, max: value } };
			return;
		}
		// Handle Euler rotation
		if (typeof this.startRotation === "object" && "type" in this.startRotation && this.startRotation.type === "Euler") {
			if (!this.startRotation.angleZ) {
				this.startRotation.angleZ = { type: "IntervalValue", min: value, max: value };
			} else {
				const currentMax = ValueUtils.parseIntervalValue(this.startRotation.angleZ).max;
				this.startRotation.angleZ = { type: "IntervalValue", min: value, max: currentMax };
			}
			return;
		}
		// Convert to Euler rotation
		const currentMax = this.maxInitialRotation;
		this.startRotation = { type: "Euler", angleZ: { type: "IntervalValue", min: value, max: currentMax } };
	}

	/**
	 * Get/set maxInitialRotation (compatible with ParticleSystem API)
	 * Works with startRotation Rotation under the hood (uses angleZ)
	 */
	public get maxInitialRotation(): number {
		if (!this.startRotation) {
			return 0;
		}
		// Handle Euler rotation with angleZ
		if (typeof this.startRotation === "object" && "type" in this.startRotation && this.startRotation.type === "Euler") {
			if (this.startRotation.angleZ) {
				return ValueUtils.parseIntervalValue(this.startRotation.angleZ).max;
			}
			return 0;
		}
		// Handle simple Value rotation
		if (typeof this.startRotation === "object" && "type" in this.startRotation) {
			return ValueUtils.parseIntervalValue(this.startRotation as any).max;
		}
		return typeof this.startRotation === "number" ? this.startRotation : 0;
	}
	public set maxInitialRotation(value: number) {
		if (!this.startRotation) {
			this.startRotation = { type: "Euler", angleZ: { type: "IntervalValue", min: value, max: value } };
			return;
		}
		// Handle Euler rotation
		if (typeof this.startRotation === "object" && "type" in this.startRotation && this.startRotation.type === "Euler") {
			if (!this.startRotation.angleZ) {
				this.startRotation.angleZ = { type: "IntervalValue", min: value, max: value };
			} else {
				const currentMin = ValueUtils.parseIntervalValue(this.startRotation.angleZ).min;
				this.startRotation.angleZ = { type: "IntervalValue", min: currentMin, max: value };
			}
			return;
		}
		// Convert to Euler rotation
		const currentMin = this.minInitialRotation;
		this.startRotation = { type: "Euler", angleZ: { type: "IntervalValue", min: currentMin, max: value } };
	}

	/**
	 * Get the parent node (mesh) for hierarchy operations
	 * Implements ISystem interface
	 */
	public getParentNode(): AbstractMesh | TransformNode | null {
		return this.mesh || null;
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

		const capacity = CapacityCalculator.calculateForSolidParticleSystem(this.emissionOverTime, this.duration, this.isLooping);
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

	/**
	 * Get emit rate (constant value from emissionOverTime)
	 */
	public get emitRate(): number {
		if (!this.emissionOverTime) {
			return 10;
		}
		return ValueUtils.parseConstantValue(this.emissionOverTime);
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
		initialConfig: IEmitterConfig,
		options?: {
			updatable?: boolean;
			isPickable?: boolean;
			enableDepthSort?: boolean;
			particleIntersection?: boolean;
			useModelMaterial?: boolean;
			parentGroup?: TransformNode | null;
			transform?: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
			particleMesh?: Mesh | null;
		}
	) {
		super(name, scene, options);

		this.name = name;
		this._behaviors = [];
		this.particleEmitterType = null;
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
		this.rendererEmitterSettings = initialConfig.rendererEmitterSettings;
		this.material = initialConfig.material;
		this.layers = initialConfig.layers;
		this.isBillboardBased = initialConfig.isBillboardBased;
		this.startTileIndex = initialConfig.startTileIndex;
		this.uTileCount = initialConfig.uTileCount;
		this.vTileCount = initialConfig.vTileCount;
		this.blendTiles = initialConfig.blendTiles;
		this.softParticles = initialConfig.softParticles || false;
		this.softFarFade = initialConfig.softFarFade;
		this.softNearFade = initialConfig.softNearFade;
		this.worldSpace = initialConfig.worldSpace || false;

		this._colorGradients = new ColorGradientSystem();
		this._sizeGradients = new NumberGradientSystem();
		this._velocityGradients = new NumberGradientSystem();
		this._angularSpeedGradients = new NumberGradientSystem();
		this._limitVelocityGradients = new NumberGradientSystem();
		this._limitVelocityDamping = 0.1;

		this.behaviorConfigs = this._createBehaviorConfigsProxy(initialConfig.behaviors || []);

		this._updateBehaviorFunctions();

		this._parent = options?.parentGroup ?? null;
		this._transform = options?.transform ?? null;
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

		if (options?.particleMesh) {
			this._initializeMesh(options.particleMesh);
		}
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

		if (this.startColor !== undefined) {
			const startColor = ValueUtils.parseConstantColor(this.startColor);
			props.startColor = startColor.clone();
			if (particle.color) {
				particle.color.copyFrom(startColor);
			} else {
				particle.color = startColor.clone();
			}
		} else {
			if (!particle.color) {
				particle.color = new Color4(1, 1, 1, 1);
			} else {
				particle.color.set(1, 1, 1, 1);
			}
			props.startColor = particle.color.clone();
		}
	}

	/**
	 * Initialize particle speed
	 */
	private _initializeParticleSpeed(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		if (this.startSpeed !== undefined) {
			props.startSpeed = ValueUtils.parseValue(this.startSpeed, normalizedTime);
		} else {
			props.startSpeed = 0;
		}
	}

	/**
	 * Initialize particle lifetime
	 */
	private _initializeParticleLife(particle: SolidParticle, normalizedTime: number): void {
		if (this.startLife !== undefined) {
			particle.lifeTime = ValueUtils.parseValue(this.startLife, normalizedTime);
		} else {
			particle.lifeTime = 1;
		}
	}

	/**
	 * Initialize particle size
	 */
	private _initializeParticleSize(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		if (this.startSize !== undefined) {
			const sizeValue = ValueUtils.parseValue(this.startSize, normalizedTime);
			props.startSize = sizeValue;
			particle.scaling.setAll(sizeValue);
		} else {
			props.startSize = 1;
			particle.scaling.setAll(1);
		}
	}

	/**
	 * Initialize particle rotation
	 * Supports Euler, AxisAngle, and RandomQuat rotation types
	 */
	private _initializeParticleRotation(particle: SolidParticle, normalizedTime: number): void {
		if (!this.startRotation) {
			particle.rotation.setAll(0);
			return;
		}

		if (
			typeof this.startRotation === "number" ||
			(typeof this.startRotation === "object" &&
				"type" in this.startRotation &&
				(this.startRotation.type === "ConstantValue" || this.startRotation.type === "IntervalValue" || this.startRotation.type === "PiecewiseBezier"))
		) {
			const angleZ = ValueUtils.parseValue(this.startRotation as Value, normalizedTime);
			particle.rotation.set(0, 0, angleZ);
			return;
		}

		if (this.startRotation.type === "Euler") {
			const angleX = this.startRotation.angleX ? ValueUtils.parseValue(this.startRotation.angleX, normalizedTime) : 0;
			const angleY = this.startRotation.angleY ? ValueUtils.parseValue(this.startRotation.angleY, normalizedTime) : 0;
			const angleZ = this.startRotation.angleZ ? ValueUtils.parseValue(this.startRotation.angleZ, normalizedTime) : 0;
			const order = this.startRotation.order || "xyz";

			let quat: Quaternion;
			if (order === "xyz") {
				quat = Quaternion.RotationYawPitchRoll(angleY, angleX, angleZ);
			} else {
				const quatZ = Quaternion.RotationAxis(Vector3.Forward(), angleZ);
				const quatY = Quaternion.RotationAxis(Vector3.Up(), angleY);
				const quatX = Quaternion.RotationAxis(Vector3.Right(), angleX);
				quat = quatZ.multiply(quatY).multiply(quatX);
			}
			const euler = quat.toEulerAngles();
			particle.rotation.set(euler.x, euler.y, euler.z);
			return;
		}

		if (this.startRotation.type === "AxisAngle") {
			const axisX = this.startRotation.x ? ValueUtils.parseValue(this.startRotation.x, normalizedTime) : 0;
			const axisY = this.startRotation.y ? ValueUtils.parseValue(this.startRotation.y, normalizedTime) : 0;
			const axisZ = this.startRotation.z ? ValueUtils.parseValue(this.startRotation.z, normalizedTime) : 1;
			const angle = this.startRotation.angle ? ValueUtils.parseValue(this.startRotation.angle, normalizedTime) : 0;

			const axis = new Vector3(axisX, axisY, axisZ);
			axis.normalize();
			const quat = Quaternion.RotationAxis(axis, angle);
			const euler = quat.toEulerAngles();
			particle.rotation.set(euler.x, euler.y, euler.z);
			return;
		}

		if (this.startRotation.type === "RandomQuat") {
			const u1 = Math.random();
			const u2 = Math.random();
			const u3 = Math.random();
			const sqrt1MinusU1 = Math.sqrt(1 - u1);
			const sqrtU1 = Math.sqrt(u1);
			const quat = new Quaternion(
				sqrt1MinusU1 * Math.sin(2 * Math.PI * u2),
				sqrt1MinusU1 * Math.cos(2 * Math.PI * u2),
				sqrtU1 * Math.sin(2 * Math.PI * u3),
				sqrtU1 * Math.cos(2 * Math.PI * u3)
			);
			const euler = quat.toEulerAngles();
			particle.rotation.set(euler.x, euler.y, euler.z);
			return;
		}

		particle.rotation.setAll(0);
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

		const normalizedTime = this.duration > 0 ? this._emissionState.time / this.duration : 0;

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

		const emissionRate = this.emissionOverTime !== undefined ? ValueUtils.parseConstantValue(this.emissionOverTime) : 10;
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

		if (this._parent) {
			this.mesh.setParent(this._parent, false, true);
		}

		if (this._transform) {
			this.mesh.position.copyFrom(this._transform.position);
			this.mesh.rotationQuaternion = this._transform.rotation.clone();
			this.mesh.scaling.copyFrom(this._transform.scale);
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
	private _createBehaviorConfigsProxy(configs: Behavior[]): Behavior[] {
		const self = this;

		const wrapBehavior = (behavior: Behavior): Behavior => {
			return new Proxy(behavior, {
				set(target, prop, value) {
					const result = Reflect.set(target, prop, value);
					self._updateBehaviorFunctions();
					return result;
				},
			});
		};

		const wrappedConfigs = configs.map(wrapBehavior);

		return new Proxy(wrappedConfigs, {
			set(target, property, value) {
				const result = Reflect.set(target, property, value);

				if (property === "length" || typeof property === "number") {
					if (typeof property === "number" && value && typeof value === "object") {
						Reflect.set(target, property, wrapBehavior(value as Behavior));
					}
					self._updateBehaviorFunctions();
				}

				return result;
			},

			get(target, property) {
				const value = Reflect.get(target, property);

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
						if (property === "push" || property === "unshift") {
							for (let i = 0; i < args.length; i++) {
								if (args[i] && typeof args[i] === "object") {
									const index = property === "push" ? target.length - args.length + i : i;
									Reflect.set(target, index, wrapBehavior(args[i] as Behavior));
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
		this._colorGradients.clear();
		this._sizeGradients.clear();
		this._velocityGradients.clear();
		this._angularSpeedGradients.clear();
		this._limitVelocityGradients.clear();

		this._applySystemLevelBehaviors();

		this._behaviors = this._createPerParticleBehaviorFunctions(this.behaviorConfigs);
	}

	/**
	 * Create per-particle behavior functions from configurations
	 * Only creates functions for behaviors that depend on particle properties (speed, orbit, force)
	 * "OverLife" behaviors are handled by gradients (system-level)
	 */
	private _createPerParticleBehaviorFunctions(behaviors: Behavior[]): PerSolidParticleBehaviorFunction[] {
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
