import { SolidParticle, Vector3 } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

/**
 * Box emitter for SolidParticleSystem
 * Emits particles from inside a box with random direction between direction1 and direction2
 */
export class SolidBoxParticleEmitter implements ISolidParticleEmitterType {
	/**
	 * Random direction of each particle after it has been emitted, between direction1 and direction2 vectors.
	 */
	public direction1: Vector3 = new Vector3(0, 1, 0);

	/**
	 * Random direction of each particle after it has been emitted, between direction1 and direction2 vectors.
	 */
	public direction2: Vector3 = new Vector3(0, 1, 0);

	/**
	 * Minimum box point around the emitter center.
	 */
	public minEmitBox: Vector3 = new Vector3(-0.5, -0.5, -0.5);

	/**
	 * Maximum box point around the emitter center.
	 */
	public maxEmitBox: Vector3 = new Vector3(0.5, 0.5, 0.5);

	constructor(
		direction1?: Vector3,
		direction2?: Vector3,
		minEmitBox?: Vector3,
		maxEmitBox?: Vector3
	) {
		if (direction1) {
			this.direction1 = direction1;
		}
		if (direction2) {
			this.direction2 = direction2;
		}
		if (minEmitBox) {
			this.minEmitBox = minEmitBox;
		}
		if (maxEmitBox) {
			this.maxEmitBox = maxEmitBox;
		}
	}

	/**
	 * Random range helper
	 */
	private _randomRange(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}

	/**
	 * Initialize particle position and velocity
	 * Note: Direction is NOT normalized, matching ParticleSystem behavior.
	 * The direction vector magnitude affects final velocity.
	 */
	public initializeParticle(particle: SolidParticle, startSpeed: number): void {
		// Random position within the box
		const randX = this._randomRange(this.minEmitBox.x, this.maxEmitBox.x);
		const randY = this._randomRange(this.minEmitBox.y, this.maxEmitBox.y);
		const randZ = this._randomRange(this.minEmitBox.z, this.maxEmitBox.z);
		particle.position.set(randX, randY, randZ);

		// Random direction between direction1 and direction2 (NOT normalized, like ParticleSystem)
		const dirX = this._randomRange(this.direction1.x, this.direction2.x);
		const dirY = this._randomRange(this.direction1.y, this.direction2.y);
		const dirZ = this._randomRange(this.direction1.z, this.direction2.z);
		particle.velocity.set(dirX * startSpeed, dirY * startSpeed, dirZ * startSpeed);
	}
}

