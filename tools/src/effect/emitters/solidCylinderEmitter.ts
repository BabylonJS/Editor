import { SolidParticle, Vector3 } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

/**
 * Cylinder emitter for SolidParticleSystem
 * Emits particles from inside a cylinder
 */
export class SolidCylinderParticleEmitter implements ISolidParticleEmitterType {
	/**
	 * The radius of the emission cylinder
	 */
	public radius: number;

	/**
	 * The height of the emission cylinder
	 */
	public height: number;

	/**
	 * The range of emission [0-1] 0 Surface only, 1 Entire Radius
	 */
	public radiusRange: number;

	/**
	 * How much to randomize the particle direction [0-1]
	 */
	public directionRandomizer: number;

	private _tempVector: Vector3 = Vector3.Zero();

	constructor(radius: number = 1, height: number = 1, radiusRange: number = 1, directionRandomizer: number = 0) {
		this.radius = radius;
		this.height = height;
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
		// Random height position
		const yPos = this._randomRange(-this.height / 2, this.height / 2);

		// Random angle around cylinder
		const angle = this._randomRange(0, 2 * Math.PI);

		// Pick a properly distributed point within the circle
		// https://programming.guide/random-point-within-circle.html
		const radiusDistribution = this._randomRange((1 - this.radiusRange) * (1 - this.radiusRange), 1);
		const positionRadius = Math.sqrt(radiusDistribution) * this.radius;

		const xPos = positionRadius * Math.cos(angle);
		const zPos = positionRadius * Math.sin(angle);

		particle.position.set(xPos, yPos, zPos);

		// Direction is outward from cylinder axis with randomization
		this._tempVector.set(xPos, 0, zPos);
		this._tempVector.normalize();

		// Apply direction randomization
		const randY = this._randomRange(-this.directionRandomizer / 2, this.directionRandomizer / 2);
		let dirAngle = Math.atan2(this._tempVector.x, this._tempVector.z);
		dirAngle += this._randomRange(-Math.PI / 2, Math.PI / 2) * this.directionRandomizer;

		particle.velocity.set(
			Math.sin(dirAngle),
			randY,
			Math.cos(dirAngle)
		);
		particle.velocity.normalize();
		particle.velocity.scaleInPlace(startSpeed);
	}
}

