import { Color4, ParticleSystem, Scene, Vector3, Matrix, Texture, AbstractMesh, TransformNode, Particle } from "babylonjs";
import type {
	Behavior,
	ColorOverLifeBehavior,
	SizeOverLifeBehavior,
	RotationOverLifeBehavior,
	ForceOverLifeBehavior,
	GravityForceBehavior,
	SpeedOverLifeBehavior,
	FrameOverLifeBehavior,
	LimitSpeedOverLifeBehavior,
	ColorBySpeedBehavior,
	SizeBySpeedBehavior,
	RotationBySpeedBehavior,
	OrbitOverLifeBehavior,
	PerParticleBehaviorFunction,
	ISystem,
	ParticleWithSystem,
	IShape,
	EmitterConfig,
	EmissionBurst,
} from "../types";
import { ValueUtils } from "../utils/valueParser";
import { CapacityCalculator } from "../utils/capacityCalculator";
import {
	applyColorOverLifePS,
	applySizeOverLifePS,
	applyRotationOverLifePS,
	applyForceOverLifePS,
	applyGravityForcePS,
	applySpeedOverLifePS,
	applyFrameOverLifePS,
	applyLimitSpeedOverLifePS,
	applyColorBySpeedPS,
	applySizeBySpeedPS,
	applyRotationBySpeedPS,
	applyOrbitOverLifePS,
} from "../behaviors";

/**
 * Extended ParticleSystem with  behaviors support
 * Fully self-contained, no dependencies on parsers or factories
 */
export class EffectParticleSystem extends ParticleSystem implements ISystem {
	public startSize: number;
	public startSpeed: number;
	public startColor: Color4;
	public prewarm: boolean;
	private _behaviors: PerParticleBehaviorFunction[];
	public readonly behaviorConfigs: Behavior[];

	constructor(
		name: string,
		scene: Scene,
		config: EmitterConfig,
		options?: {
			texture?: Texture;
			blendMode?: number;
		}
	) {
		// Calculate capacity
		const duration = config.duration || 5;
		const capacity = CapacityCalculator.calculateForParticleSystem(config.emissionOverTime, duration);

		super(name, capacity, scene);
		this._behaviors = [];
		this.prewarm = config.prewarm || false;

		// Create proxy array that updates functions when modified
		this.behaviorConfigs = this._createBehaviorConfigsProxy(config.behaviors || []);

		// Configure from config
		this._configureFromConfig(config, options);
	}

	/**
	 * Get the parent node (emitter) for hierarchy operations
	 * Required by ISystem interface
	 */
	public getParentNode(): AbstractMesh | TransformNode | null {
		// ParticleSystem.emitter can be AbstractMesh, Vector3, or null
		// Return emitter if it's an AbstractMesh, otherwise null
		return this.emitter instanceof AbstractMesh ? this.emitter : null;
	}

	/**
	 * Get behavior functions (internal use)
	 */
	public get behaviors(): PerParticleBehaviorFunction[] {
		return this._behaviors;
	}

	/**
	 * Create a proxy array that automatically updates behavior functions when configs change
	 */
	private _createBehaviorConfigsProxy(configs: Behavior[]): Behavior[] {
		const self = this;

		// Wrap each behavior object in a proxy to detect property changes
		const wrapBehavior = (behavior: Behavior): Behavior => {
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
						Reflect.set(target, property, wrapBehavior(value as Behavior));
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
	 * Applies both system-level behaviors (gradients) and per-particle behaviors
	 */
	private _updateBehaviorFunctions(): void {
		// Apply system-level behaviors (gradients, etc.) - these configure the ParticleSystem once
		this._applySystemLevelBehaviors();

		// Create per-particle behavior functions (BySpeed, OrbitOverLife, etc.)
		this._behaviors = this._createPerParticleBehaviorFunctions(this.behaviorConfigs);
	}

	/**
	 * Create per-particle behavior functions from configurations
	 * Only creates functions for behaviors that depend on particle properties (speed, orbit)
	 */
	private _createPerParticleBehaviorFunctions(behaviors: Behavior[]): PerParticleBehaviorFunction[] {
		const functions: PerParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorBySpeed": {
					const b = behavior as ColorBySpeedBehavior;
					functions.push((particle: Particle) => {
						applyColorBySpeedPS(particle, b);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as SizeBySpeedBehavior;
					functions.push((particle: Particle) => {
						applySizeBySpeedPS(particle, b);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as RotationBySpeedBehavior;
					functions.push((particle: Particle) => {
						// Store reference to system in particle for behaviors that need it
						const particleWithSystem = particle as ParticleWithSystem;
						particleWithSystem.particleSystem = this;
						applyRotationBySpeedPS(particle, b);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as OrbitOverLifeBehavior;
					functions.push((particle: Particle) => {
						applyOrbitOverLifePS(particle, b);
					});
					break;
				}
			}
		}

		return functions;
	}

	/**
	 * Apply system-level behaviors (gradients, etc.) to ParticleSystem
	 * These are applied once when behaviors change, not per-particle
	 */
	private _applySystemLevelBehaviors(): void {
		for (const behavior of this.behaviorConfigs) {
			if (!behavior.type) {
				continue;
			}

			switch (behavior.type) {
				case "ColorOverLife":
					applyColorOverLifePS(this, behavior as ColorOverLifeBehavior);
					break;
				case "SizeOverLife":
					applySizeOverLifePS(this, behavior as SizeOverLifeBehavior);
					break;
				case "RotationOverLife":
				case "Rotation3DOverLife":
					applyRotationOverLifePS(this, behavior as RotationOverLifeBehavior);
					break;
				case "ForceOverLife":
				case "ApplyForce":
					applyForceOverLifePS(this, behavior as ForceOverLifeBehavior);
					break;
				case "GravityForce":
					applyGravityForcePS(this, behavior as GravityForceBehavior);
					break;
				case "SpeedOverLife":
					applySpeedOverLifePS(this, behavior as SpeedOverLifeBehavior);
					break;
				case "FrameOverLife":
					applyFrameOverLifePS(this, behavior as FrameOverLifeBehavior);
					break;
				case "LimitSpeedOverLife":
					applyLimitSpeedOverLifePS(this, behavior as LimitSpeedOverLifeBehavior);
					break;
			}
		}
	}

	/**
	 * Configure particle system from  config (internal use)
	 * This method applies all configuration from ParticleEmitterConfig
	 */
	private _configureFromConfig(
		config: EmitterConfig,
		options?: {
			texture?: Texture;
			blendMode?: number;
			emitterShape?: { shape: IShape | undefined; cumulativeScale: Vector3; rotationMatrix: Matrix | null };
		}
	): void {
		// Parse values
		const emissionRate = config.emissionOverTime !== undefined ? ValueUtils.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const lifeTime = config.startLife !== undefined ? ValueUtils.parseIntervalValue(config.startLife) : { min: 1, max: 1 };
		const speed = config.startSpeed !== undefined ? ValueUtils.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const size = config.startSize !== undefined ? ValueUtils.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const startColor = config.startColor !== undefined ? ValueUtils.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);

		// Configure basic properties
		this.targetStopDuration = duration;
		this.emitRate = emissionRate;
		this.manualEmitCount = -1;
		this.minLifeTime = lifeTime.min;
		this.maxLifeTime = lifeTime.max;
		this.minEmitPower = speed.min;
		this.maxEmitPower = speed.max;
		this.minSize = size.min;
		this.maxSize = size.max;
		this.color1 = startColor;
		this.color2 = startColor;
		this.colorDead = new Color4(startColor.r, startColor.g, startColor.b, 0);

		// Configure rotation
		if (config.startRotation) {
			if (this._isEulerRotation(config.startRotation)) {
				if (config.startRotation.angleZ !== undefined) {
					const angleZ = ValueUtils.parseIntervalValue(config.startRotation.angleZ);
					this.minInitialRotation = angleZ.min;
					this.maxInitialRotation = angleZ.max;
				}
			} else {
				const rotation = ValueUtils.parseIntervalValue(config.startRotation as any);
				this.minInitialRotation = rotation.min;
				this.maxInitialRotation = rotation.max;
			}
		}

		// Configure sprite tiles
		if (config.uTileCount !== undefined && config.vTileCount !== undefined) {
			if (config.uTileCount > 1 || config.vTileCount > 1) {
				this.isAnimationSheetEnabled = true;
				this.spriteCellWidth = config.uTileCount;
				this.spriteCellHeight = config.vTileCount;

				if (config.startTileIndex !== undefined) {
					const startTile = ValueUtils.parseConstantValue(config.startTileIndex);
					this.startSpriteCellID = Math.floor(startTile);
					this.endSpriteCellID = Math.floor(startTile);
				}
			}
		}

		// Configure rendering
		if (config.renderOrder !== undefined) {
			this.renderingGroupId = config.renderOrder;
		}
		if (config.layers !== undefined) {
			this.layerMask = config.layers;
		}

		// Apply texture and blend mode
		if (options?.texture) {
			this.particleTexture = options.texture;
		}
		if (options?.blendMode !== undefined) {
			this.blendMode = options.blendMode;
		}

		// Apply emission bursts
		if (config.emissionBursts && Array.isArray(config.emissionBursts) && config.emissionBursts.length > 0) {
			this._applyEmissionBursts(config.emissionBursts, emissionRate, duration);
		}

		// Apply behaviors
		if (config.behaviors && Array.isArray(config.behaviors) && config.behaviors.length > 0) {
			this.behaviorConfigs.length = 0;
			this.behaviorConfigs.push(...config.behaviors);
		}

		// Configure world space
		if (config.worldSpace !== undefined) {
			this.isLocal = !config.worldSpace;
		}

		// Configure looping
		if (config.looping !== undefined) {
			this.targetStopDuration = config.looping ? 0 : duration;
		}

		// Configure billboard mode (converted from renderMode in DataConverter)
		if (config.isBillboardBased !== undefined) {
			this.isBillboardBased = config.isBillboardBased;
		}
		if (config.billboardMode !== undefined) {
			this.billboardMode = config.billboardMode;
		}

		// Configure auto destroy
		if (config.autoDestroy !== undefined) {
			this.disposeOnStop = config.autoDestroy;
		}

		// Emitter shape is created in SystemFactory after system creation
	}

	/**
	 * Check if rotation is Euler type
	 */
	private _isEulerRotation(rotation: any): rotation is { type: "Euler"; angleZ?: any } {
		return typeof rotation === "object" && rotation !== null && "type" in rotation && rotation.type === "Euler";
	}

	/**
	 * Apply emission bursts via emit rate gradients
	 */
	private _applyEmissionBursts(bursts: EmissionBurst[], baseEmitRate: number, duration: number): void {
		for (const burst of bursts) {
			if (burst.time === undefined || burst.count === undefined) {
				continue;
			}

			const burstTime = ValueUtils.parseConstantValue(burst.time);
			const burstCount = ValueUtils.parseConstantValue(burst.count);
			const timeRatio = Math.min(Math.max(burstTime / duration, 0), 1);
			const windowSize = 0.02;
			const burstEmitRate = burstCount / windowSize;

			const beforeTime = Math.max(0, timeRatio - windowSize);
			const afterTime = Math.min(1, timeRatio + windowSize);

			this.addEmitRateGradient(beforeTime, baseEmitRate);
			this.addEmitRateGradient(timeRatio, burstEmitRate);
			this.addEmitRateGradient(afterTime, baseEmitRate);
		}
	}
}
