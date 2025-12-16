import { SolidParticle, Vector3 } from "babylonjs";
import { ISolidParticleEmitterType } from "../types";

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
