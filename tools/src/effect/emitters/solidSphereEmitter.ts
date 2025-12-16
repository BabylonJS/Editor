import { SolidParticle } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

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
