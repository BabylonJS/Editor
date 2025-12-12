import { Vector3, Quaternion, Matrix, Color4, SolidParticleSystem, SolidParticle, TransformNode, Mesh } from "babylonjs";
import type { VFXParticleEmitterConfig, VFXEmissionBurst } from "../types/emitterConfig";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXPerSolidParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type { VFXBehavior } from "../types/behaviors";
import type { VFXShape } from "../types/shapes";
import type { VFXColor } from "../types/colors";
import type { VFXValue } from "../types/values";
import type { VFXRotation } from "../types/rotations";
import { VFXSolidParticleSystemBehaviorFactory } from "../factories/VFXSolidParticleSystemBehaviorFactory";
import { VFXSolidParticleSystemEmitterFactory } from "../factories/VFXSolidParticleSystemEmitterFactory";
import { VFXValueUtils } from "../utils/valueParser";

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
	private _behaviorFactory: VFXSolidParticleSystemBehaviorFactory;
	private _emitterFactory: VFXSolidParticleSystemEmitterFactory;
	private _parent: TransformNode | null;
	private _vfxTransform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
	private _logger: VFXLogger | null;
	private _options: VFXLoaderOptions | undefined;
	private _name: string;
	private _emitEnded: boolean;

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
	 * Initialize mesh for SPS
	 * Adds the mesh as a shape and configures billboard mode
	 */
	public initializeMesh(particleMesh: Mesh, capacity: number): void {
		if (!particleMesh) {
			if (this._logger) {
				this._logger.warn(`Cannot add shape to SPS: particleMesh is null`, this._options);
			}
			return;
		}

		if (this._logger) {
			this._logger.log(`Adding shape to SPS: mesh name=${particleMesh.name}, hasMaterial=${!!particleMesh.material}`, this._options);
		}

		// Add shape to SPS
		this.addShape(particleMesh, capacity);

		// Configure billboard mode
		if (this.renderMode === 0 || this.renderMode === 1) {
			this.billboard = true;
		}
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
		}
	) {
		super(name, scene, options);

		this._name = name;
		this._behaviors = [];
		this._behaviorFactory = new VFXSolidParticleSystemBehaviorFactory();
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

		// Create proxy array for behavior configs
		this.behaviorConfigs = this._createBehaviorConfigsProxy(initialConfig.behaviors || []);

		// Initialize behavior functions from config
		this._updateBehaviorFunctions();

		this._parent = options?.parentGroup ?? null;
		this._vfxTransform = options?.vfxTransform ?? null;
		this._logger = options?.logger ?? null;
		this._options = options?.loaderOptions;
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
				this._logger.warn(`  SPS mesh is null in initParticles!`, this._options);
			}
			return;
		}

		if (this._logger) {
			this._logger.log(`  initParticles called for SPS: ${this._name}`, this._options);
			this._logger.log(`  SPS mesh exists: ${this.mesh.name}`, this._options);
		}

		if (this.renderOrder !== undefined) {
			this.mesh.renderingGroupId = this.renderOrder;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh renderingGroupId: ${this.renderOrder}`, this._options);
			}
		}

		if (this.layers !== undefined) {
			this.mesh.layerMask = this.layers;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh layerMask: ${this.layers}`, this._options);
			}
		}

		if (this._parent) {
			this.mesh.setParent(this._parent, false, true);
			if (this._logger) {
				this._logger.log(`  Set SPS mesh parent to: ${this._parent.name}`, this._options);
			}
		} else if (this._logger) {
			this._logger.log(`  No parent group to set for SPS mesh`, this._options);
		}

		if (this._vfxTransform) {
			this.mesh.position.copyFrom(this._vfxTransform.position);
			this.mesh.rotationQuaternion = this._vfxTransform.rotation.clone();
			this.mesh.scaling.copyFrom(this._vfxTransform.scale);

			if (this._logger) {
				const rot = this.mesh.rotationQuaternion;
				this._logger.log(
					`  Applied VFX transform to SPS mesh: pos=(${this._vfxTransform.position.x.toFixed(2)}, ${this._vfxTransform.position.y.toFixed(2)}, ${this._vfxTransform.position.z.toFixed(2)}), rot=(${rot ? rot.x.toFixed(4) : 0}, ${rot ? rot.y.toFixed(4) : 0}, ${rot ? rot.z.toFixed(4) : 0}, ${rot ? rot.w.toFixed(4) : 1}), scale=(${this._vfxTransform.scale.x.toFixed(2)}, ${this._vfxTransform.scale.y.toFixed(2)}, ${this._vfxTransform.scale.z.toFixed(2)})`,
					this._options
				);
			}
		} else if (this._logger) {
			this._logger.log(`  No VFX transform to apply to SPS mesh`, this._options);
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
	private _updateBehaviorFunctions(): void {
		this._behaviors = this._behaviorFactory.createBehaviorFunctions(this.behaviorConfigs);
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

		// Store reference to system in particle for behaviors that need it
		(particle as any).system = this;

		// Apply behaviors - they receive only particle and behavior config
		// All data (lifeRatio, speed, etc.) comes from particle itself
		// Behavior config is stored in closure by factory, so we pass it from behaviorConfigs
		for (let i = 0; i < this._behaviors.length && i < this.behaviorConfigs.length; i++) {
			const behaviorFn = this._behaviors[i];
			const behaviorConfig = this.behaviorConfigs[i];
			behaviorFn(particle, behaviorConfig);
		}

		const speedModifier = particle.props?.speedModifier ?? 1.0;
		particle.position.addInPlace(particle.velocity.scale(this.updateSpeed * speedModifier));

		return particle;
	}
}
