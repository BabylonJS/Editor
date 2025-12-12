import { Particle } from "babylonjs";
import type { VFXPerParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type { VFXBehavior, VFXColorBySpeedBehavior, VFXSizeBySpeedBehavior, VFXRotationBySpeedBehavior, VFXOrbitOverLifeBehavior } from "../types/behaviors";
import { applyColorBySpeedPS, applySizeBySpeedPS, applyRotationBySpeedPS, applyOrbitOverLifePS } from "../behaviors";
import type { ParticleSystem } from "babylonjs";

/**
 * Behavior factory for VFXParticleSystem
 * Creates behavior functions from configurations
 */
export class VFXParticleSystemBehaviorFactory {
	private _particleSystem: ParticleSystem;

	constructor(particleSystem: ParticleSystem) {
		this._particleSystem = particleSystem;
	}

	/**
	 * Create behavior functions from configurations
	 * Behaviors receive only particle and behavior config - all data comes from particle
	 */
	public createBehaviorFunctions(behaviors: VFXBehavior[]): VFXPerParticleBehaviorFunction[] {
		const functions: VFXPerParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorBySpeed": {
					const b = behavior as VFXColorBySpeedBehavior;
					functions.push((particle: Particle, _behaviorConfig: VFXBehavior) => {
						applyColorBySpeedPS(particle, b);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as VFXSizeBySpeedBehavior;
					functions.push((particle: Particle, _behaviorConfig: VFXBehavior) => {
						applySizeBySpeedPS(particle, b);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as VFXRotationBySpeedBehavior;
					functions.push((particle: Particle, _behaviorConfig: VFXBehavior) => {
						// Store reference to system in particle for behaviors that need it
						(particle as any).particleSystem = this._particleSystem;
						applyRotationBySpeedPS(particle, b);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as VFXOrbitOverLifeBehavior;
					functions.push((particle: Particle, _behaviorConfig: VFXBehavior) => {
						applyOrbitOverLifePS(particle, b);
					});
					break;
				}
			}
		}

		return functions;
	}
}
