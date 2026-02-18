import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Particle } from "@babylonjs/core/Particles/particle";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Behavior, PerParticleBehaviorFunction, ISystem, ParticleWithSystem, IShape } from "../types";
import { applySystemLevelBehaviorsPS, buildPerParticleBehaviorsPS } from "../behaviors";

/**
 * Extended ParticleSystem with behaviors support
 * Integrates per-particle behaviors (ColorBySpeed, OrbitOverLife, etc.)
 * into the native Babylon.js particle update loop
 */
export class EffectParticleSystem extends ParticleSystem implements ISystem {
	private _perParticleBehaviors: PerParticleBehaviorFunction[] = [];
	private _behaviorConfigs: Behavior[] = [];
	private _parent: AbstractMesh | TransformNode | null;

	constructor(name: string, capacity: number, scene: Scene) {
		super(name, capacity, scene);
		this._setupEmitter();
		this._setupCustomUpdateFunction();
	}

	public get parent(): AbstractMesh | TransformNode | null {
		return this._parent;
	}

	public set parent(parent: AbstractMesh | TransformNode | null) {
		this._parent = parent;
		// Set emitter's parent (emitter is a TransformNode)
		if (this.emitter && this.emitter instanceof TransformNode) {
			this.emitter.parent = parent;
		}
	}

	private _setupEmitter(): void {
		this.emitter = new TransformNode("Emitter", this._scene) as AbstractMesh;
	}

	/**
	 * Setup custom updateFunction that extends default behavior
	 * with per-particle behavior execution
	 */
	private _setupCustomUpdateFunction(): void {
		const defaultUpdateFunction = this.updateFunction;
		this.updateFunction = (particles: Particle[]): void => {
			// First, run the default Babylon.js update logic
			// This handles: age, gradients (color, size, angular speed, velocity), position, gravity, etc.
			defaultUpdateFunction(particles);

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
	 * Get current behavior configurations (read-only copy)
	 */
	public get behaviorConfigs(): Behavior[] {
		return [...this._behaviorConfigs];
	}

	/**
	 * Set behaviors and apply them to the particle system
	 * System-level behaviors configure gradients, per-particle behaviors run each frame
	 */
	public setBehaviors(behaviors: Behavior[]): void {
		this._behaviorConfigs = [...behaviors];
		applySystemLevelBehaviorsPS(this, behaviors);
		this._perParticleBehaviors = buildPerParticleBehaviorsPS(behaviors);
	}

	/**
	 * Add a single behavior
	 */
	public addBehavior(behavior: Behavior): void {
		this._behaviorConfigs.push(behavior);
		this.setBehaviors(this._behaviorConfigs);
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
