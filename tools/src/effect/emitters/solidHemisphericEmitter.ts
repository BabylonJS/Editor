import { SolidParticle } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

/**
 * Hemispheric emitter for SolidParticleSystem
 * Emits particles from the inside of a hemisphere (upper half of a sphere)
 */
export class SolidHemisphericParticleEmitter implements ISolidParticleEmitterType {
	/**
	 * The radius of the emission hemisphere
	 */
	public radius: number;

	/**
	 * The range of emission [0-1] 0 Surface only, 1 Entire Radius
	 */
	public radiusRange: number;

	/**
	 * How much to randomize the particle direction [0-1]
	 */
	public directionRandomizer: number;

	constructor(radius: number = 1, radiusRange: number = 1, directionRandomizer: number = 0) {
		this.radius = radius;
		this.radiusRange = radiusRange;
		this.directionRandomizer = directionRandomizer;
	}

	/**
	 * Random range helper
	 */
	private _randomRange(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}

	/**
	 * Initialize particle position and velocity
	 */
	public initializeParticle(particle: SolidParticle, startSpeed: number): void {
		// Calculate random position within hemisphere
		const randRadius = this.radius - this._randomRange(0, this.radius * this.radiusRange);
		const v = Math.random();
		const phi = this._randomRange(0, 2 * Math.PI);
		const theta = Math.acos(2 * v - 1);

		const x = randRadius * Math.cos(phi) * Math.sin(theta);
		const y = randRadius * Math.cos(theta);
		const z = randRadius * Math.sin(phi) * Math.sin(theta);

		// Use absolute y to keep particles in upper hemisphere
		particle.position.set(x, Math.abs(y), z);

		// Direction is outward from center with optional randomization
		particle.velocity.copyFrom(particle.position);
		particle.velocity.normalize();

		// Apply direction randomization
		if (this.directionRandomizer > 0) {
			particle.velocity.x += this._randomRange(0, this.directionRandomizer);
			particle.velocity.y += this._randomRange(0, this.directionRandomizer);
			particle.velocity.z += this._randomRange(0, this.directionRandomizer);
			particle.velocity.normalize();
		}

		particle.velocity.scaleInPlace(startSpeed);
	}
}

