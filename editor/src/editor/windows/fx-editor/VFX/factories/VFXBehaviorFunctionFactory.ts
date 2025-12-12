import { Particle, SolidParticle, ParticleSystem } from "babylonjs";
import type {
	VFXBehavior,
	VFXColorBySpeedBehavior,
	VFXSizeBySpeedBehavior,
	VFXRotationBySpeedBehavior,
	VFXOrbitOverLifeBehavior,
	VFXForceOverLifeBehavior,
} from "../types/behaviors";
import type { VFXValueParser } from "../parsers/VFXValueParser";
import type { VFXPerParticleBehaviorFunction, VFXPerSolidParticleBehaviorFunction, VFXSystemBehaviorFunction, VFXPerParticleContext } from "../types/VFXBehaviorFunction";
import {
	applyColorOverLifeSPS,
	applySizeOverLifeSPS,
	applyRotationOverLifeSPS,
	applySpeedOverLifeSPS,
	applyColorBySpeedSPS,
	applySizeBySpeedSPS,
	applyRotationBySpeedSPS,
	applyOrbitOverLifeSPS,
	applyColorBySpeedPS,
	applySizeBySpeedPS,
	applyRotationBySpeedPS,
	applyOrbitOverLifePS,
} from "../behaviors";

export class VFXBehaviorFunctionFactory {
	public static createPerParticleFunctionsSPS(behaviors: VFXBehavior[], valueParser: VFXValueParser): VFXPerSolidParticleBehaviorFunction[] {
		const functions: VFXPerSolidParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorOverLife": {
					const b = behavior as any;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applyColorOverLifeSPS(particle, b, context.lifeRatio);
					});
					break;
				}

				case "SizeOverLife": {
					const b = behavior as any;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applySizeOverLifeSPS(particle, b, context.lifeRatio);
					});
					break;
				}

				case "RotationOverLife":
				case "Rotation3DOverLife": {
					const b = behavior as any;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applyRotationOverLifeSPS(particle, b, context.lifeRatio, valueParser, context.updateSpeed);
					});
					break;
				}

				case "ForceOverLife":
				case "ApplyForce": {
					const b = behavior as VFXForceOverLifeBehavior;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						const forceX = b.x ?? b.force?.x;
						const forceY = b.y ?? b.force?.y;
						const forceZ = b.z ?? b.force?.z;
						if (forceX !== undefined || forceY !== undefined || forceZ !== undefined) {
							const fx = forceX !== undefined ? valueParser.parseConstantValue(forceX) : 0;
							const fy = forceY !== undefined ? valueParser.parseConstantValue(forceY) : 0;
							const fz = forceZ !== undefined ? valueParser.parseConstantValue(forceZ) : 0;
							particle.velocity.x += fx * context.updateSpeed;
							particle.velocity.y += fy * context.updateSpeed;
							particle.velocity.z += fz * context.updateSpeed;
						}
					});
					break;
				}

				case "SpeedOverLife": {
					const b = behavior as any;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applySpeedOverLifeSPS(particle, b, context.lifeRatio, valueParser);
					});
					break;
				}

				case "ColorBySpeed": {
					const b = behavior as VFXColorBySpeedBehavior;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applyColorBySpeedSPS(particle, b, context.startSpeed, valueParser);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as VFXSizeBySpeedBehavior;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applySizeBySpeedSPS(particle, b, context.startSpeed, valueParser);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as VFXRotationBySpeedBehavior;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applyRotationBySpeedSPS(particle, b, context.startSpeed, valueParser, context.updateSpeed);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as VFXOrbitOverLifeBehavior;
					functions.push((particle: SolidParticle, context: VFXPerParticleContext) => {
						applyOrbitOverLifeSPS(particle, b, context.lifeRatio, valueParser);
					});
					break;
				}
			}
		}

		return functions;
	}

	public static createPerParticleFunctionsPS(behaviors: VFXBehavior[], valueParser: VFXValueParser, particleSystem: ParticleSystem): VFXPerParticleBehaviorFunction[] {
		const functions: VFXPerParticleBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorBySpeed": {
					const b = behavior as VFXColorBySpeedBehavior;
					functions.push((particle: Particle, context: VFXPerParticleContext) => {
						applyColorBySpeedPS(particle as any, b, context.startSpeed, valueParser);
					});
					break;
				}

				case "SizeBySpeed": {
					const b = behavior as VFXSizeBySpeedBehavior;
					functions.push((particle: Particle, context: VFXPerParticleContext) => {
						applySizeBySpeedPS(particle as any, b, context.startSpeed, valueParser);
					});
					break;
				}

				case "RotationBySpeed": {
					const b = behavior as VFXRotationBySpeedBehavior;
					functions.push((particle: Particle, context: VFXPerParticleContext) => {
						applyRotationBySpeedPS(particle as any, b, context.startSpeed, particleSystem, valueParser);
					});
					break;
				}

				case "OrbitOverLife": {
					const b = behavior as VFXOrbitOverLifeBehavior;
					functions.push((particle: Particle, context: VFXPerParticleContext) => {
						applyOrbitOverLifePS(particle, b, context.lifeRatio, valueParser);
					});
					break;
				}
			}
		}

		return functions;
	}

	public static createSystemFunctions(behaviors: VFXBehavior[], _valueParser: VFXValueParser): VFXSystemBehaviorFunction[] {
		const functions: VFXSystemBehaviorFunction[] = [];

		for (const behavior of behaviors) {
			switch (behavior.type) {
				case "ColorOverLife":
				case "SizeOverLife":
				case "RotationOverLife":
				case "Rotation3DOverLife":
				case "ForceOverLife":
				case "ApplyForce":
				case "GravityForce":
				case "SpeedOverLife":
				case "FrameOverLife":
				case "LimitSpeedOverLife":
					// handled at emitter level
					break;
			}
		}

		return functions;
	}
}
