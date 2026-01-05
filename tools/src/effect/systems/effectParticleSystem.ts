import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Particle } from "@babylonjs/core/Particles/particle";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type {
	Behavior,
	IColorOverLifeBehavior,
	ISizeOverLifeBehavior,
	IRotationOverLifeBehavior,
	IForceOverLifeBehavior,
	IGravityForceBehavior,
	ISpeedOverLifeBehavior,
	IFrameOverLifeBehavior,
	ILimitSpeedOverLifeBehavior,
	IColorBySpeedBehavior,
	ISizeBySpeedBehavior,
	IRotationBySpeedBehavior,
	IOrbitOverLifeBehavior,
	PerParticleBehaviorFunction,
	ISystem,
	ParticleWithSystem,
	IShape,
} from "../types";
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
 * Extended ParticleSystem with behaviors support
 * Integrates per-particle behaviors (ColorBySpeed, OrbitOverLife, etc.)
 * into the native Babylon.js particle update loop
 */
export class EffectParticleSystem extends ParticleSystem implements ISystem {
	private _perParticleBehaviors: PerParticleBehaviorFunction[];
	private _behaviorConfigs: Behavior[];
	private _parent: AbstractMesh | TransformNode | null;

	/** Store reference to default updateFunction */
	private _defaultUpdateFunction: (particles: Particle[]) => void;

	constructor(name: string, capacity: number, scene: Scene) {
		super(name, capacity, scene);
		this._perParticleBehaviors = [];
		this._behaviorConfigs = [];

		// Store reference to the default updateFunction created by ParticleSystem
		this._defaultUpdateFunction = this.updateFunction;

		// Override updateFunction to integrate per-particle behaviors
		this._setupCustomUpdateFunction();
	}

	public get parent(): AbstractMesh | TransformNode | null {
		return this._parent;
	}

	public set parent(parent: AbstractMesh | TransformNode | null) {
		this._parent = parent;
	}

	public setParent(parent: AbstractMesh | TransformNode | null): void {
		this._parent = parent;
	}

	/**
	 * Setup custom updateFunction that extends default behavior
	 * with per-particle behavior execution
	 */
	private _setupCustomUpdateFunction(): void {
		this.updateFunction = (particles: Particle[]): void => {
			// First, run the default Babylon.js update logic
			// This handles: age, gradients (color, size, angular speed, velocity), position, gravity, etc.
			this._defaultUpdateFunction(particles);

			// Then apply per-particle behaviors if any exist
			if (this._perParticleBehaviors.length === 0) {
				return;
			}

			// Apply per-particle behaviors to each active particle
			for (const particle of particles) {
				// Attach system reference for behaviors that need it
				(particle as ParticleWithSystem).particleSystem = this;

				// Execute all per-particle behavior functions
				for (const behaviorFn of this._perParticleBehaviors) {
					behaviorFn(particle);
				}
			}
		};
	}

	/**
	 * Get the parent node (emitter) for hierarchy operations
	 * Required by ISystem interface
	 */
	public getParentNode(): AbstractMesh | TransformNode | null {
		return this.emitter instanceof AbstractMesh ? this.emitter : null;
	}

	/**
	 * Get current behavior configurations
	 */
	public get behaviorConfigs(): Behavior[] {
		return this._behaviorConfigs;
	}

	/**
	 * Set behaviors and apply them to the particle system
	 * System-level behaviors configure gradients, per-particle behaviors run each frame
	 */
	public setBehaviors(behaviors: Behavior[]): void {
		this._behaviorConfigs = behaviors;

		// Apply system-level behaviors (gradients) to ParticleSystem
		this._applySystemLevelBehaviors(behaviors);

		// Build per-particle behavior functions for update loop
		this._perParticleBehaviors = this._buildPerParticleBehaviors(behaviors);
	}

	/**
	 * Add a single behavior
	 */
	public addBehavior(behavior: Behavior): void {
		this._behaviorConfigs.push(behavior);
		this.setBehaviors(this._behaviorConfigs);
	}

	/**
	 * Build per-particle behavior functions from configurations
	 * Per-particle behaviors run each frame for each particle (ColorBySpeed, OrbitOverLife, etc.)
	 */
	private _buildPerParticleBehaviors(behaviors: Behavior[]): PerParticleBehaviorFunction[] {
		const functions: PerParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorBySpeed": {
					const b = behavior as IColorBySpeedBehavior;
					functions.push((particle: Particle) => applyColorBySpeedPS(b, particle));
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as ISizeBySpeedBehavior;
					functions.push((particle: Particle) => applySizeBySpeedPS(particle, b));
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as IRotationBySpeedBehavior;
					functions.push((particle: Particle) => applyRotationBySpeedPS(particle, b));
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as IOrbitOverLifeBehavior;
					functions.push((particle: Particle) => applyOrbitOverLifePS(particle, b));
					break;
				}
			}
		}

		return functions;
	}

	/**
	 * Apply system-level behaviors (gradients) to ParticleSystem
	 * These configure native Babylon.js gradients once, not per-particle
	 */
	private _applySystemLevelBehaviors(behaviors: Behavior[]): void {
		for (const behavior of behaviors) {
			if (!behavior.type) {
				continue;
			}

			switch (behavior.type) {
				case "ColorOverLife":
					applyColorOverLifePS(this, behavior as IColorOverLifeBehavior);
					break;
				case "SizeOverLife":
					applySizeOverLifePS(this, behavior as ISizeOverLifeBehavior);
					break;
				case "RotationOverLife":
				case "Rotation3DOverLife":
					applyRotationOverLifePS(this, behavior as IRotationOverLifeBehavior);
					break;
				case "ForceOverLife":
				case "ApplyForce":
					applyForceOverLifePS(this, behavior as IForceOverLifeBehavior);
					break;
				case "GravityForce":
					applyGravityForcePS(this, behavior as IGravityForceBehavior);
					break;
				case "SpeedOverLife":
					applySpeedOverLifePS(this, behavior as ISpeedOverLifeBehavior);
					break;
				case "FrameOverLife":
					applyFrameOverLifePS(this, behavior as IFrameOverLifeBehavior);
					break;
				case "LimitSpeedOverLife":
					applyLimitSpeedOverLifePS(this, behavior as ILimitSpeedOverLifeBehavior);
					break;
			}
		}
	}

	/**
	 * Configure emitter from shape config
	 * This replaces the need for EmitterFactory
	 */
	public configureEmitterFromShape(shape: IShape): void {
		if (!shape || !shape.type) {
			this.createPointEmitter(new Vector3(0, 1, 0), new Vector3(0, 1, 0));
			return;
		}

		const shapeType = shape.type.toLowerCase();
		const radius = shape.radius ?? 1;
		const angle = shape.angle ?? Math.PI / 4;

		switch (shapeType) {
			case "cone":
				this.createConeEmitter(radius, angle);
				break;
			case "sphere":
				this.createSphereEmitter(radius);
				break;
			case "point":
				this.createPointEmitter(new Vector3(0, 1, 0), new Vector3(0, 1, 0));
				break;
			case "box": {
				const boxSize = shape.size || [1, 1, 1];
				const minBox = new Vector3(-boxSize[0] / 2, -boxSize[1] / 2, -boxSize[2] / 2);
				const maxBox = new Vector3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2);
				this.createBoxEmitter(new Vector3(0, 1, 0), new Vector3(0, 1, 0), minBox, maxBox);
				break;
			}
			case "hemisphere":
				this.createHemisphericEmitter(radius);
				break;
			case "cylinder": {
				const height = shape.height ?? 1;
				this.createCylinderEmitter(radius, height);
				break;
			}
			default:
				this.createPointEmitter(new Vector3(0, 1, 0), new Vector3(0, 1, 0));
				break;
		}
	}
}
