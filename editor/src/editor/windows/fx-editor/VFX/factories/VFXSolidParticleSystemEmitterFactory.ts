import { SolidParticle, Vector3 } from "babylonjs";
import type { VFXShape } from "../types/shapes";

/**
 * Factory for initializing particle positions and velocities based on emitter shape for SolidParticleSystem
 * This is used during particle initialization, not emitter creation
 */
export class VFXSolidParticleSystemEmitterFactory {
	/**
	 * Initialize particle position and velocity based on emitter shape
	 */
	public initializeParticle(particle: SolidParticle, shape: VFXShape | undefined, startSpeed: number): void {
		if (!shape) {
			this._initializeDefaultShape(particle, startSpeed);
			return;
		}

		const shapeType = shape.type?.toLowerCase();
		const radius = shape.radius ?? 1;
		const arc = shape.arc ?? Math.PI * 2;
		const thickness = shape.thickness ?? 1;
		const angle = shape.angle ?? Math.PI / 6;

		switch (shapeType) {
			case "sphere":
				this._initializeSphereShape(particle, radius, arc, thickness, startSpeed);
				break;
			case "cone":
				this._initializeConeShape(particle, radius, arc, thickness, angle, startSpeed);
				break;
			case "point":
				this._initializePointShape(particle, startSpeed);
				break;
			default:
				this._initializeDefaultShape(particle, startSpeed);
				break;
		}
	}

	/**
	 * Initialize default shape (point emitter)
	 */
	private _initializeDefaultShape(particle: SolidParticle, startSpeed: number): void {
		particle.position.setAll(0);
		particle.velocity.set(0, 1, 0);
		particle.velocity.scaleInPlace(startSpeed);
	}

	/**
	 * Initialize sphere shape
	 */
	private _initializeSphereShape(particle: SolidParticle, radius: number, arc: number, thickness: number, startSpeed: number): void {
		const u = Math.random();
		const v = Math.random();
		const rand = 1 - thickness + Math.random() * thickness;
		const theta = u * arc;
		const phi = Math.acos(2.0 * v - 1.0);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);
		const sinPhi = Math.sin(phi);
		const cosPhi = Math.cos(phi);

		particle.position.set(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi);
		particle.velocity.copyFrom(particle.position);
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(radius * rand);
	}

	/**
	 * Initialize cone shape
	 */
	private _initializeConeShape(particle: SolidParticle, radius: number, arc: number, thickness: number, angle: number, startSpeed: number): void {
		const u = Math.random();
		const rand = 1 - thickness + Math.random() * thickness;
		const theta = u * arc;
		const r = Math.sqrt(rand);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);

		particle.position.set(r * cosTheta, r * sinTheta, 0);
		const coneAngle = angle * r;
		particle.velocity.set(0, 0, Math.cos(coneAngle));
		particle.velocity.addInPlace(particle.position.scale(Math.sin(coneAngle)));
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(radius);
	}

	/**
	 * Initialize point shape
	 */
	private _initializePointShape(particle: SolidParticle, startSpeed: number): void {
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2.0 * Math.random() - 1.0);
		const direction = new Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
		particle.position.setAll(0);
		particle.velocity.copyFrom(direction);
		particle.velocity.scaleInPlace(startSpeed);
	}
}

