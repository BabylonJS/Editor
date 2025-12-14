import { Vector3 } from "babylonjs";
import type { SolidParticle } from "babylonjs";

/**
 * Interface for SolidParticleSystem emitter types
 * Similar to IParticleEmitterType for ParticleSystem
 */
export interface ISolidParticleEmitterType {
	/**
	 * Initialize particle position and velocity based on emitter shape
	 */
	initializeParticle(particle: SolidParticle, startSpeed: number): void;
}

/**
 * Point emitter for SolidParticleSystem
 */
export class SolidPointParticleEmitter implements ISolidParticleEmitterType {
	public initializeParticle(particle: SolidParticle, startSpeed: number): void {
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2.0 * Math.random() - 1.0);
		const direction = new Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
		particle.position.setAll(0);
		particle.velocity.copyFrom(direction);
		particle.velocity.scaleInPlace(startSpeed);
	}
}

/**
 * Sphere emitter for SolidParticleSystem
 */
export class SolidSphereParticleEmitter implements ISolidParticleEmitterType {
	public radius: number;
	public arc: number;
	public thickness: number;

	constructor(radius: number = 1, arc: number = Math.PI * 2, thickness: number = 1) {
		this.radius = radius;
		this.arc = arc;
		this.thickness = thickness;
	}

	public initializeParticle(particle: SolidParticle, startSpeed: number): void {
		const u = Math.random();
		const v = Math.random();
		const rand = 1 - this.thickness + Math.random() * this.thickness;
		const theta = u * this.arc;
		const phi = Math.acos(2.0 * v - 1.0);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);
		const sinPhi = Math.sin(phi);
		const cosPhi = Math.cos(phi);

		particle.position.set(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi);
		particle.velocity.copyFrom(particle.position);
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(this.radius * rand);
	}
}

/**
 * Cone emitter for SolidParticleSystem
 */
export class SolidConeParticleEmitter implements ISolidParticleEmitterType {
	public radius: number;
	public arc: number;
	public thickness: number;
	public angle: number;

	constructor(radius: number = 1, arc: number = Math.PI * 2, thickness: number = 1, angle: number = Math.PI / 6) {
		this.radius = radius;
		this.arc = arc;
		this.thickness = thickness;
		this.angle = angle;
	}

	public initializeParticle(particle: SolidParticle, startSpeed: number): void {
		const u = Math.random();
		const rand = 1 - this.thickness + Math.random() * this.thickness;
		const theta = u * this.arc;
		const r = Math.sqrt(rand);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);

		particle.position.set(r * cosTheta, r * sinTheta, 0);
		const coneAngle = this.angle * r;
		particle.velocity.set(0, 0, Math.cos(coneAngle));
		particle.velocity.addInPlace(particle.position.scale(Math.sin(coneAngle)));
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(this.radius);
	}
}
