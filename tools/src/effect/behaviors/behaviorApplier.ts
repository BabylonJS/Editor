/**
 * Shared behavior application layer for EffectParticleSystem and EffectSolidParticleSystem.
 * Single place for system-level (gradient) application and per-particle behavior building.
 */

import { Particle } from "@babylonjs/core/Particles/particle";
import { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type {
	Behavior,
	IColorOverLifeBehavior,
	ISizeOverLifeBehavior,
	IRotationOverLifeBehavior,
	IForceOverLifeBehavior,
	IGravityForceBehavior,
	ISpeedOverLifeBehavior,
	IFrameOverLifeBehavior,
	ILimitSpeedOverLifeBehavior,
	IColorBySpeedBehavior,
	ISizeBySpeedBehavior,
	IRotationBySpeedBehavior,
	IOrbitOverLifeBehavior,
	PerParticleBehaviorFunction,
	PerSolidParticleBehaviorFunction,
	Value,
	IGradientKey,
} from "../types";
import type { EffectParticleSystem, EffectSolidParticleSystem } from "../systems";
import { parseConstantValue, parseIntervalValue } from "../utils";
import { applyColorOverLifePS, applyColorOverLifeSPS } from "./colorOverLife";
import { applyRotationOverLifePS, applyRotationOverLifeSPS } from "./rotationOverLife";
import { applyForceOverLifePS, applyGravityForcePS } from "./forceOverLife";
import { applySpeedOverLifePS, applySpeedOverLifeSPS } from "./speedOverLife";
import { applyFrameOverLifePS } from "./frameOverLife";
import { applyLimitSpeedOverLifePS, applyLimitSpeedOverLifeSPS } from "./limitSpeedOverLife";
import { applyColorBySpeedPS } from "./colorBySpeed";
import { applySizeBySpeedPS } from "./sizeBySpeed";
import { applyRotationBySpeedPS } from "./rotationBySpeed";
import { applyOrbitOverLifePS } from "./orbitOverLife";
import { applySizeOverLifeSPS, applySizeOverLifePS } from "./sizeOverLife";
import { interpolateColorKeys, interpolateGradientKeys, extractNumberFromValue } from "./utils";

/** Apply system-level behaviors (gradients) to ParticleSystem. Called once when behaviors change. */
export function applySystemLevelBehaviorsPS(system: EffectParticleSystem, behaviors: Behavior[]): void {
	for (const behavior of behaviors) {
		if (!behavior.type) {
			continue;
		}
		switch (behavior.type) {
			case "ColorOverLife":
				applyColorOverLifePS(system, behavior as IColorOverLifeBehavior);
				break;
			case "SizeOverLife":
				applySizeOverLifePS(system, behavior as ISizeOverLifeBehavior);
				break;
			case "RotationOverLife":
			case "Rotation3DOverLife":
				applyRotationOverLifePS(system, behavior as IRotationOverLifeBehavior);
				break;
			case "ForceOverLife":
			case "ApplyForce":
				applyForceOverLifePS(system, behavior as IForceOverLifeBehavior);
				break;
			case "GravityForce":
				applyGravityForcePS(system, behavior as IGravityForceBehavior);
				break;
			case "SpeedOverLife":
				applySpeedOverLifePS(system, behavior as ISpeedOverLifeBehavior);
				break;
			case "FrameOverLife":
				applyFrameOverLifePS(system, behavior as IFrameOverLifeBehavior);
				break;
			case "LimitSpeedOverLife":
				applyLimitSpeedOverLifePS(system, behavior as ILimitSpeedOverLifeBehavior);
				break;
		}
	}
}

/** Apply system-level behaviors (gradients) to SolidParticleSystem. Called once when behaviors change. */
export function applySystemLevelBehaviorsSPS(system: EffectSolidParticleSystem, behaviors: Behavior[]): void {
	for (const behavior of behaviors) {
		if (!behavior.type) {
			continue;
		}
		switch (behavior.type) {
			case "ColorOverLife":
				applyColorOverLifeSPS(system, behavior as IColorOverLifeBehavior);
				break;
			case "SizeOverLife":
				applySizeOverLifeSPS(system, behavior as ISizeOverLifeBehavior);
				break;
			case "RotationOverLife":
			case "Rotation3DOverLife":
				applyRotationOverLifeSPS(system, behavior as IRotationOverLifeBehavior);
				break;
			case "SpeedOverLife":
				applySpeedOverLifeSPS(system, behavior as ISpeedOverLifeBehavior);
				break;
			case "LimitSpeedOverLife":
				applyLimitSpeedOverLifeSPS(system, behavior as ILimitSpeedOverLifeBehavior);
				break;
		}
	}
}

/** Build per-particle behavior functions for ParticleSystem. Parse values once, run each frame per particle. */
export function buildPerParticleBehaviorsPS(behaviors: Behavior[]): PerParticleBehaviorFunction[] {
	const functions: PerParticleBehaviorFunction[] = [];
	for (const behavior of behaviors) {
		switch (behavior.type) {
			case "ColorBySpeed":
				functions.push((particle: Particle) => applyColorBySpeedPS(behavior as IColorBySpeedBehavior, particle));
				break;
			case "SizeBySpeed":
				functions.push((particle: Particle) => applySizeBySpeedPS(particle, behavior as ISizeBySpeedBehavior));
				break;
			case "RotationBySpeed":
				functions.push((particle: Particle) => applyRotationBySpeedPS(particle, behavior as IRotationBySpeedBehavior));
				break;
			case "OrbitOverLife":
				functions.push((particle: Particle) => applyOrbitOverLifePS(particle, behavior as IOrbitOverLifeBehavior));
				break;
		}
	}
	return functions;
}

/** Build per-particle behavior functions for SolidParticleSystem. Parse values once, run each frame per particle. */
export function buildPerParticleBehaviorsSPS(system: EffectSolidParticleSystem, behaviors: Behavior[]): PerSolidParticleBehaviorFunction[] {
	const functions: PerSolidParticleBehaviorFunction[] = [];

	for (const behavior of behaviors) {
		switch (behavior.type) {
			case "ForceOverLife":
			case "ApplyForce": {
				const b = behavior as IForceOverLifeBehavior;
				const forceX = b.x ?? b.force?.x;
				const forceY = b.y ?? b.force?.y;
				const forceZ = b.z ?? b.force?.z;
				const fx = forceX !== undefined ? parseConstantValue(forceX) : 0;
				const fy = forceY !== undefined ? parseConstantValue(forceY) : 0;
				const fz = forceZ !== undefined ? parseConstantValue(forceZ) : 0;
				if (fx !== 0 || fy !== 0 || fz !== 0) {
					functions.push((particle: SolidParticle) => {
						const deltaTime = system.scaledUpdateSpeed || system.updateSpeed;
						particle.velocity.x += fx * deltaTime;
						particle.velocity.y += fy * deltaTime;
						particle.velocity.z += fz * deltaTime;
					});
				}
				break;
			}

			case "ColorBySpeed": {
				const b = behavior as IColorBySpeedBehavior;
				const minSpeed = b.minSpeed !== undefined ? parseConstantValue(b.minSpeed) : 0;
				const maxSpeed = b.maxSpeed !== undefined ? parseConstantValue(b.maxSpeed) : 1;
				const colorKeys = b.color?.data?.colorKeys;
				if (colorKeys && colorKeys.length > 0) {
					functions.push((particle: SolidParticle) => {
						if (!particle.color) {
							return;
						}
						const vel = particle.velocity;
						const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
						const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
						const interpolatedColor = interpolateColorKeys(colorKeys, speedRatio);
						const startColor = particle.props?.startColor;
						if (startColor) {
							particle.color.r = interpolatedColor.r * startColor.r;
							particle.color.g = interpolatedColor.g * startColor.g;
							particle.color.b = interpolatedColor.b * startColor.b;
							particle.color.a = startColor.a;
						} else {
							particle.color.r = interpolatedColor.r;
							particle.color.g = interpolatedColor.g;
							particle.color.b = interpolatedColor.b;
						}
						particle.color.toLinearSpaceToRef(particle.color);
					});
				}
				break;
			}

			case "SizeBySpeed": {
				const b = behavior as ISizeBySpeedBehavior;
				const minSpeed = b.minSpeed !== undefined ? parseConstantValue(b.minSpeed) : 0;
				const maxSpeed = b.maxSpeed !== undefined ? parseConstantValue(b.maxSpeed) : 1;
				const sizeKeys = b.size?.keys;
				if (sizeKeys && sizeKeys.length > 0) {
					functions.push((particle: SolidParticle) => {
						const vel = particle.velocity;
						const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
						const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
						const sizeMultiplier = interpolateGradientKeys(sizeKeys, speedRatio, extractNumberFromValue);
						const startSize = particle.props?.startSize ?? 1;
						particle.scaling.setAll(startSize * sizeMultiplier);
					});
				}
				break;
			}

			case "RotationBySpeed": {
				const b = behavior as IRotationBySpeedBehavior;
				const minSpeed = b.minSpeed !== undefined ? parseConstantValue(b.minSpeed) : 0;
				const maxSpeed = b.maxSpeed !== undefined ? parseConstantValue(b.maxSpeed) : 1;
				const angularVelocity = b.angularVelocity;
				const hasKeys =
					angularVelocity !== undefined &&
					angularVelocity !== null &&
					typeof angularVelocity === "object" &&
					"keys" in angularVelocity &&
					Array.isArray(angularVelocity.keys) &&
					angularVelocity.keys.length > 0;
				let constantAngularSpeed = 0;
				if (!hasKeys && angularVelocity) {
					const parsed = parseIntervalValue(angularVelocity as Value);
					constantAngularSpeed = (parsed.min + parsed.max) / 2;
				}
				const angularVelocityKeys = hasKeys ? (angularVelocity as { keys: IGradientKey[] }).keys : undefined;
				functions.push((particle: SolidParticle) => {
					const vel = particle.velocity;
					const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
					const deltaTime = system.scaledUpdateSpeed || system.updateSpeed;
					let angularSpeed = constantAngularSpeed;
					if (angularVelocityKeys) {
						const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
						angularSpeed = interpolateGradientKeys(angularVelocityKeys, speedRatio, extractNumberFromValue);
					}
					particle.rotation.z += angularSpeed * deltaTime;
				});
				break;
			}

			case "OrbitOverLife": {
				const b = behavior as IOrbitOverLifeBehavior;
				const speed = b.speed !== undefined ? parseConstantValue(b.speed) : 1;
				const centerX = b.center?.x ?? 0;
				const centerY = b.center?.y ?? 0;
				const centerZ = b.center?.z ?? 0;
				const radiusValue = b.radius;
				const hasRadiusKeys =
					radiusValue !== undefined &&
					radiusValue !== null &&
					typeof radiusValue === "object" &&
					"keys" in radiusValue &&
					Array.isArray(radiusValue.keys) &&
					radiusValue.keys.length > 0;
				let constantRadius = 1;
				if (!hasRadiusKeys && radiusValue !== undefined) {
					const parsed = parseIntervalValue(radiusValue as Value);
					constantRadius = (parsed.min + parsed.max) / 2;
				}
				const radiusKeys = hasRadiusKeys ? (radiusValue as { keys: IGradientKey[] }).keys : undefined;
				functions.push((particle: SolidParticle) => {
					if (particle.lifeTime <= 0) {
						return;
					}
					const lifeRatio = particle.age / particle.lifeTime;
					let radius = constantRadius;
					if (radiusKeys) {
						radius = interpolateGradientKeys(radiusKeys, lifeRatio, extractNumberFromValue);
					}
					const angle = lifeRatio * speed * Math.PI * 2;
					const orbitX = Math.cos(angle) * radius;
					const orbitY = Math.sin(angle) * radius;
					const props = (particle.props ||= {}) as { orbitInitialPos?: { x: number; y: number; z: number } };
					if (props.orbitInitialPos === undefined) {
						props.orbitInitialPos = { x: particle.position.x, y: particle.position.y, z: particle.position.z };
					}
					particle.position.x = props.orbitInitialPos.x + centerX + orbitX;
					particle.position.y = props.orbitInitialPos.y + centerY + orbitY;
					particle.position.z = props.orbitInitialPos.z + centerZ;
				});
				break;
			}
		}
	}
	return functions;
}
