import { Vector3, Quaternion, Matrix, Color4, SolidParticleSystem, SolidParticle, TransformNode, Mesh, AbstractMesh } from "babylonjs";
import type { VFXParticleEmitterConfig, VFXEmissionBurst } from "../types/emitterConfig";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXPerSolidParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type { IVFXSystem, SolidParticleWithSystem } from "../types/system";
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
export class VFXSolidParticleSystem extends SolidParticleSystem implements IVFXSystem {
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
	 * Get the parent node (mesh) for hierarchy operations
	 * Implements IVFXSystem interface
	 */
	public getParentNode(): AbstractMesh | TransformNode | null {
		return this.mesh || null;
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

		// Enable vertex colors and alpha for particle color support
		// This must be done after addShape but before buildMesh
		// The mesh will be created in buildMesh, so we'll set it there
		
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

	/**
	 * Find a dead particle for recycling
	 * Оптимизировано: кешируем particles и nbParticles
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
	 * Оптимизировано: используем прямые присваивания вместо setAll где возможно
	 */
	private _resetParticle(particle: SolidParticle): void {
		particle.age = 0;
		particle.alive = true;
		particle.isVisible = true;
		particle._stillInvisible = false; // Сбрасываем флаг невидимости
		particle.position.setAll(0);
		particle.velocity.setAll(0);
		particle.rotation.setAll(0);
		particle.scaling.setAll(1);

		// Оптимизация: создаем color только если его нет
		if (particle.color) {
			particle.color.set(1, 1, 1, 1);
		} else {
			particle.color = new Color4(1, 1, 1, 1);
		}

		// Оптимизация: создаем props только если его нет
		const props = particle.props || (particle.props = {});
		props.speedModifier = 1.0;
	}

	/**
	 * Initialize particle color
	 * Оптимизировано: кешируем props и избегаем лишних созданий объектов
	 */
	private _initializeParticleColor(particle: SolidParticle): void {
		const props = particle.props!;

		if (this.startColor !== undefined) {
			const startColor = VFXValueUtils.parseConstantColor(this.startColor);
			props.startColor = startColor.clone();
			if (particle.color) {
				particle.color.copyFrom(startColor);
			} else {
				particle.color = startColor.clone();
			}
		} else {
			// Используем один объект для всех частиц без цвета (оптимизация памяти)
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
	 * Оптимизировано: normalizedTime передается как параметр (вычисляется один раз в _spawn)
	 */
	private _initializeParticleSpeed(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		if (this.startSpeed !== undefined) {
			props.startSpeed = VFXValueUtils.parseValue(this.startSpeed, normalizedTime);
		} else {
			props.startSpeed = 0;
		}
	}

	/**
	 * Initialize particle lifetime
	 * Оптимизировано: normalizedTime передается как параметр (вычисляется один раз в _spawn)
	 */
	private _initializeParticleLife(particle: SolidParticle, normalizedTime: number): void {
		if (this.startLife !== undefined) {
			particle.lifeTime = VFXValueUtils.parseValue(this.startLife, normalizedTime);
		} else {
			particle.lifeTime = 1;
		}
	}

	/**
	 * Initialize particle size
	 * Оптимизировано: normalizedTime передается как параметр (вычисляется один раз в _spawn)
	 */
	private _initializeParticleSize(particle: SolidParticle, normalizedTime: number): void {
		const props = particle.props!;
		if (this.startSize !== undefined) {
			const sizeValue = VFXValueUtils.parseValue(this.startSize, normalizedTime);
			props.startSize = sizeValue;
			particle.scaling.setAll(sizeValue);
		} else {
			props.startSize = 1;
			particle.scaling.setAll(1);
		}
	}

	/**
	 * Spawn particles from dead pool
	 * Оптимизировано: вычисляем матрицу эмиттера один раз для всех частиц
	 */
	private _spawn(count: number): void {
		if (count <= 0) {
			return;
		}

		const emissionState = this._emissionState;

		// Вычисляем матрицу эмиттера один раз для всех частиц
		const emitterMatrix = this._getEmitterMatrix();
		const translation = this._tempVec;
		const quaternion = this._tempQuat;
		const scale = this._tempVec2;
		emitterMatrix.decompose(scale, quaternion, translation);
		emitterMatrix.toNormalMatrix(this._normalMatrix);

		// Кешируем normalizedTime один раз для всех частиц в этом спавне
		const normalizedTime = this.duration > 0 ? this._emissionState.time / this.duration : 0;

		for (let i = 0; i < count; i++) {
			emissionState.burstParticleIndex = i;

			const particle = this._findDeadParticle();
			if (!particle) {
				// Логируем только один раз для избежания спама
				if (i === 0 && this._logger) {
					this._logger.warn(`No dead particles available for spawning. Capacity may be insufficient.`);
				}
				break; // Нет смысла продолжать, если нет мертвых частиц
			}

			// Вызываем методы напрямую (быстрее, чем bind)
			this._resetParticle(particle);
			this._initializeParticleColor(particle);
			this._initializeParticleSpeed(particle, normalizedTime);
			this._initializeParticleLife(particle, normalizedTime);
			this._initializeParticleSize(particle, normalizedTime);
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
		// Сначала накапливаем эмиссию для текущего кадра
		this._accumulateEmission(delta);

		// Потом спавним частицы из накопленного waitEmiting
		this._spawnFromWaitEmiting();

		// Спавним bursts
		this._spawnBursts();
	}

	private _getBurstTime(burst: VFXEmissionBurst): number {
		return VFXValueUtils.parseConstantValue(burst.time);
	}

	/**
	 * Override buildMesh to enable vertex colors and alpha
	 * This is required for ColorOverLife behavior to work visually
	 */
	public override buildMesh(): Mesh {
		const mesh = super.buildMesh();
		
		// Enable vertex colors and alpha for particle color support
		// This is required for ColorOverLife behavior to work
		if (mesh) {
			mesh.hasVertexAlpha = true;
			if (this._logger) {
				this._logger.log(`Enabled hasVertexAlpha for SPS mesh: ${mesh.name}`);
			}
		}
		
		return mesh;
	}

	private _setupMeshProperties(): void {
		if (!this.mesh) {
			if (this._logger) {
				this._logger.warn(`  SPS mesh is null in initParticles!`);
			}
			return;
		}

		// Ensure vertex alpha is enabled (in case mesh was already built)
		if (!this.mesh.hasVertexAlpha) {
			this.mesh.hasVertexAlpha = true;
			if (this._logger) {
				this._logger.log(`Enabled hasVertexAlpha for existing SPS mesh: ${this.mesh.name}`);
			}
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
						const particleWithSystem = particle as SolidParticleWithSystem;
						const updateSpeed = particleWithSystem.system?.updateSpeed ?? 0.016;

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

		// Сначала увеличиваем время
		this._emissionState.time += deltaTime;

		// Потом эмиттим (внутри _emit будет накопление и спавн)
		this._emit(deltaTime);

		// В конце обрабатываем looping (теперь time уже увеличен)
		this._handleEmissionLooping();
	}

	private _updateParticle(particle: SolidParticle): SolidParticle {
		// Ранний выход для мертвых частиц - базовый класс пропустит их обработку (continue)
		if (!particle.alive) {
			particle.isVisible = false;

			// Обнуляем позиции только если частица еще не была помечена как невидимая
			// Базовый класс обнуляет позиции для невидимых, но живых частиц в блоке else.
			// Для мертвых частиц базовый класс делает continue до блока else,
			// поэтому нам нужно обнулить позиции здесь, но только один раз.
			if (!particle._stillInvisible && this._positions32 && particle._model) {
				const shape = particle._model._shape;
				const startIdx = particle._pos;
				const positions32 = this._positions32;
				// Оптимизированное обнуление: используем один цикл с прямым доступом
				for (let pt = 0, len = shape.length; pt < len; pt++) {
					const idx = startIdx + pt * 3;
					positions32[idx] = positions32[idx + 1] = positions32[idx + 2] = 0;
				}
				particle._stillInvisible = true; // Помечаем как невидимую для оптимизации
			}

			return particle;
		}

		// Базовый класс уже обновил particle.age и проверил lifetime перед вызовом updateParticle
		// Calculate lifeRatio for gradient interpolation
		const lifeRatio = particle.lifeTime > 0 ? particle.age / particle.lifeTime : 0;

		// Apply "OverLife" gradients (similar to ParticleSystem native gradients)
		this._applyGradients(particle, lifeRatio);

		// Store reference to system in particle for behaviors that need it
		// Используем type assertion только один раз для оптимизации
		const particleWithSystem = particle as SolidParticleWithSystem;
		particleWithSystem.system = this;

		// Apply per-particle behaviors (BySpeed, OrbitOverLife, etc.)
		// These behaviors don't use gradients as they depend on particle properties, not lifeRatio
		// Behavior config is captured in closure, so we only need to pass particle
		const behaviors = this._behaviors;
		for (let i = 0, len = behaviors.length; i < len; i++) {
			behaviors[i](particle);
		}

		// Apply velocity with speed modifier
		// Оптимизация: кешируем props и используем прямое обращение
		const props = particle.props;
		const speedModifier = props?.speedModifier ?? 1.0;
		const updateSpeed = this.updateSpeed;
		particle.position.addInPlace(particle.velocity.scale(updateSpeed * speedModifier));

		return particle;
	}

	/**
	 * Apply gradients to particle based on lifeRatio
	 * Оптимизировано для производительности: кешируем props и updateSpeed
	 */
	private _applyGradients(particle: SolidParticle, lifeRatio: number): void {
		// Кешируем props и updateSpeed для избежания повторных обращений
		const props = particle.props || (particle.props = {});
		const updateSpeed = this.updateSpeed;

		// Apply color gradient
		const color = this._colorGradients.getValue(lifeRatio);
		if (color && particle.color) {
			// Always apply gradient color directly to particle.color
			// The base class will apply this to vertex colors if _computeParticleColor is enabled
			particle.color.copyFrom(color);
			
			// Multiply with startColor if it exists (matching ParticleSystem behavior)
			const startColor = props.startColor;
			if (startColor) {
				particle.color.r *= startColor.r;
				particle.color.g *= startColor.g;
				particle.color.b *= startColor.b;
				particle.color.a *= startColor.a;
			}
		}

		// Apply size gradient
		const size = this._sizeGradients.getValue(lifeRatio);
		if (size !== null && props.startSize !== undefined) {
			particle.scaling.setAll(props.startSize * size);
		}

		// Apply velocity gradient (speed modifier)
		const velocity = this._velocityGradients.getValue(lifeRatio);
		if (velocity !== null) {
			props.speedModifier = velocity;
		}

		// Apply angular speed gradient
		const angularSpeed = this._angularSpeedGradients.getValue(lifeRatio);
		if (angularSpeed !== null) {
			particle.rotation.z += angularSpeed * updateSpeed;
		}

		// Apply limit velocity
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
