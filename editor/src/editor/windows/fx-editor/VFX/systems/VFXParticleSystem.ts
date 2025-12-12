import { Color4, ParticleSystem, Scene, Vector3, Matrix, Texture } from "babylonjs";
import type { VFXPerParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type {
	VFXBehavior,
	VFXColorOverLifeBehavior,
	VFXSizeOverLifeBehavior,
	VFXRotationOverLifeBehavior,
	VFXForceOverLifeBehavior,
	VFXGravityForceBehavior,
	VFXSpeedOverLifeBehavior,
	VFXFrameOverLifeBehavior,
	VFXLimitSpeedOverLifeBehavior,
} from "../types/behaviors";
import type { VFXShape } from "../types/shapes";
import type { VFXParticleEmitterConfig, VFXEmissionBurst } from "../types/emitterConfig";
import { VFXParticleSystemBehaviorFactory } from "../factories/VFXParticleSystemBehaviorFactory";
import { VFXParticleSystemEmitterFactory } from "../factories/VFXParticleSystemEmitterFactory";
import { VFXValueUtils } from "../utils/valueParser";
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
 * Extended ParticleSystem with VFX behaviors support
 * Fully self-contained, no dependencies on parsers or factories
 */
export class VFXParticleSystem extends ParticleSystem {
	public startSize: number;
	public startSpeed: number;
	public startColor: Color4;
	private _behaviors: VFXPerParticleBehaviorFunction[];
	private _behaviorFactory: VFXParticleSystemBehaviorFactory;
	private _emitterFactory: VFXParticleSystemEmitterFactory;
	public readonly behaviorConfigs: VFXBehavior[];

	constructor(name: string, capacity: number, scene: Scene, _avgStartSpeed: number, _avgStartSize: number, _startColor: Color4) {
		super(name, capacity, scene);
		this._behaviors = [];
		this._behaviorFactory = new VFXParticleSystemBehaviorFactory(this);
		this._emitterFactory = new VFXParticleSystemEmitterFactory(this);

		// Create proxy array that updates functions when modified
		this.behaviorConfigs = this._createBehaviorConfigsProxy([]);
	}

	/**
	 * Create emitter shape based on VFX shape configuration
	 */
	public createEmitterShape(shape: VFXShape | undefined, cumulativeScale: Vector3, rotationMatrix: Matrix | null): void {
		this._emitterFactory.createEmitter(shape, cumulativeScale, rotationMatrix);
	}

	/**
	 * Get behavior functions (internal use)
	 */
	public get behaviors(): VFXPerParticleBehaviorFunction[] {
		return this._behaviors;
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
	 * Applies both system-level behaviors (gradients) and per-particle behaviors
	 */
	private _updateBehaviorFunctions(): void {
		// Apply system-level behaviors (gradients, etc.) - these configure the ParticleSystem once
		this._applySystemLevelBehaviors();

		// Create per-particle behavior functions
		this._behaviors = this._behaviorFactory.createBehaviorFunctions(this.behaviorConfigs);
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
					applyColorOverLifePS(this, behavior as VFXColorOverLifeBehavior);
					break;
				case "SizeOverLife":
					applySizeOverLifePS(this, behavior as VFXSizeOverLifeBehavior);
					break;
				case "RotationOverLife":
				case "Rotation3DOverLife":
					applyRotationOverLifePS(this, behavior as VFXRotationOverLifeBehavior);
					break;
				case "ForceOverLife":
				case "ApplyForce":
					applyForceOverLifePS(this, behavior as VFXForceOverLifeBehavior);
					break;
				case "GravityForce":
					applyGravityForcePS(this, behavior as VFXGravityForceBehavior);
					break;
				case "SpeedOverLife":
					applySpeedOverLifePS(this, behavior as VFXSpeedOverLifeBehavior);
					break;
				case "FrameOverLife":
					applyFrameOverLifePS(this, behavior as VFXFrameOverLifeBehavior);
					break;
				case "LimitSpeedOverLife":
					applyLimitSpeedOverLifePS(this, behavior as VFXLimitSpeedOverLifeBehavior);
					break;
			}
		}
	}

	/**
	 * Configure particle system from VFX config
	 * This method applies all configuration from VFXParticleEmitterConfig
	 */
	public configureFromConfig(
		config: VFXParticleEmitterConfig,
		options?: {
			texture?: Texture;
			blendMode?: number;
			emitterShape?: { shape: VFXShape | undefined; cumulativeScale: Vector3; rotationMatrix: Matrix | null };
		}
	): void {
		// Parse values
		const emissionRate = config.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const lifeTime = config.startLife !== undefined ? VFXValueUtils.parseIntervalValue(config.startLife) : { min: 1, max: 1 };
		const speed = config.startSpeed !== undefined ? VFXValueUtils.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const size = config.startSize !== undefined ? VFXValueUtils.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const startColor = config.startColor !== undefined ? VFXValueUtils.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);

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
					const angleZ = VFXValueUtils.parseIntervalValue(config.startRotation.angleZ);
					this.minInitialRotation = angleZ.min;
					this.maxInitialRotation = angleZ.max;
				}
			} else {
				const rotation = VFXValueUtils.parseIntervalValue(config.startRotation as any);
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
					const startTile = VFXValueUtils.parseConstantValue(config.startTileIndex);
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

		// Configure render mode
		if (config.renderMode !== undefined) {
			if (config.renderMode === 0) {
				this.isBillboardBased = true;
			} else if (config.renderMode === 1) {
				this.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
			}
		}

		// Configure auto destroy
		if (config.autoDestroy !== undefined) {
			this.disposeOnStop = config.autoDestroy;
		}

		// Set emitter shape
		if (options?.emitterShape) {
			this.createEmitterShape(options.emitterShape.shape, options.emitterShape.cumulativeScale, options.emitterShape.rotationMatrix);
		}
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
	private _applyEmissionBursts(bursts: VFXEmissionBurst[], baseEmitRate: number, duration: number): void {
		for (const burst of bursts) {
			if (burst.time === undefined || burst.count === undefined) {
				continue;
			}

			const burstTime = VFXValueUtils.parseConstantValue(burst.time);
			const burstCount = VFXValueUtils.parseConstantValue(burst.count);
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
