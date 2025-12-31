import { SolidParticle } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

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
