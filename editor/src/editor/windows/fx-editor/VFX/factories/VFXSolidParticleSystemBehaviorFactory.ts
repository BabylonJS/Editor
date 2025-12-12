import { SolidParticle } from "babylonjs";
import type { VFXPerSolidParticleBehaviorFunction } from "../types/VFXBehaviorFunction";
import type {
	VFXBehavior,
	VFXColorOverLifeBehavior,
	VFXSizeOverLifeBehavior,
	VFXRotationOverLifeBehavior,
	VFXForceOverLifeBehavior,
	VFXSpeedOverLifeBehavior,
	VFXColorBySpeedBehavior,
	VFXSizeBySpeedBehavior,
	VFXRotationBySpeedBehavior,
	VFXOrbitOverLifeBehavior,
} from "../types/behaviors";
import { VFXValueUtils } from "../utils/valueParser";
import {
	applyColorOverLifeSPS,
	applySizeOverLifeSPS,
	applyRotationOverLifeSPS,
	applySpeedOverLifeSPS,
	applyColorBySpeedSPS,
	applySizeBySpeedSPS,
	applyRotationBySpeedSPS,
	applyOrbitOverLifeSPS,
} from "../behaviors";

/**
 * Behavior factory for VFXSolidParticleSystem
 * Creates behavior functions from configurations
 */
export class VFXSolidParticleSystemBehaviorFactory {
	/**
	 * Create behavior functions from configurations
	 * Behaviors receive only particle and behavior config - all data comes from particle
	 */
	public createBehaviorFunctions(behaviors: VFXBehavior[]): VFXPerSolidParticleBehaviorFunction[] {
		const functions: VFXPerSolidParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorOverLife": {
					const b = behavior as VFXColorOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applyColorOverLifeSPS(particle, b);
					});
					break;
				}

				case "SizeOverLife": {
					const b = behavior as VFXSizeOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applySizeOverLifeSPS(particle, b);
					});
					break;
				}

				case "RotationOverLife":
				case "Rotation3DOverLife": {
					const b = behavior as VFXRotationOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applyRotationOverLifeSPS(particle, b);
					});
					break;
				}

				case "ForceOverLife":
				case "ApplyForce": {
					const b = behavior as VFXForceOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						// Get updateSpeed from system (stored in particle.props or use default)
						const updateSpeed = (particle as any).system?.updateSpeed ?? 0.016;

						const forceX = b.x ?? b.force?.x;
						const forceY = b.y ?? b.force?.y;
						const forceZ = b.z ?? b.force?.z;
						if (forceX !== undefined || forceY !== undefined || forceZ !== undefined) {
							const fx = forceX !== undefined ? VFXValueUtils.parseConstantValue(forceX) : 0;
							const fy = forceY !== undefined ? VFXValueUtils.parseConstantValue(forceY) : 0;
							const fz = forceZ !== undefined ? VFXValueUtils.parseConstantValue(forceZ) : 0;
							particle.velocity.x += fx * updateSpeed;
							particle.velocity.y += fy * updateSpeed;
							particle.velocity.z += fz * updateSpeed;
						}
					});
					break;
				}

				case "SpeedOverLife": {
					const b = behavior as VFXSpeedOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applySpeedOverLifeSPS(particle, b);
					});
					break;
				}

				case "ColorBySpeed": {
					const b = behavior as VFXColorBySpeedBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applyColorBySpeedSPS(particle, b);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as VFXSizeBySpeedBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applySizeBySpeedSPS(particle, b);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as VFXRotationBySpeedBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applyRotationBySpeedSPS(particle, b);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as VFXOrbitOverLifeBehavior;
					functions.push((particle: SolidParticle, _behaviorConfig: VFXBehavior) => {
						applyOrbitOverLifeSPS(particle, b);
					});
					break;
				}
			}
		}

		return functions;
	}
}
