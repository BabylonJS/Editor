import { Color4, ParticleSystem, Scene } from "babylonjs";
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
import { VFXParticleSystemBehaviorFactory } from "../factories/VFXParticleSystemBehaviorFactory";
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
	public readonly behaviorConfigs: VFXBehavior[];

	constructor(name: string, capacity: number, scene: Scene, _avgStartSpeed: number, _avgStartSize: number, _startColor: Color4) {
		super(name, capacity, scene);
		this._behaviors = [];
		this._behaviorFactory = new VFXParticleSystemBehaviorFactory(this);

		// Create proxy array that updates functions when modified
		this.behaviorConfigs = this._createBehaviorConfigsProxy([]);
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
}
