import type { ParticleSystem } from "../../particleSystem";
import type { SolidParticle } from "../../solidParticle";
import type { VFXSpeedOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply SpeedOverLife behavior to ParticleSystem
 */
export function applySpeedOverLifePS(particleSystem: ParticleSystem, behavior: VFXSpeedOverLifeBehavior, valueParser: VFXValueParser): void {
    if (behavior.speed) {
        if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
            for (const key of behavior.speed.keys) {
                const pos = key.pos ?? key.time ?? 0;
                const val = key.value;
                if (val !== undefined && pos !== undefined) {
                    const numVal = extractNumberFromValue(val);
                    particleSystem.addVelocityGradient(pos, numVal);
                }
            }
        } else if (
            typeof behavior.speed === "object" &&
            behavior.speed !== null &&
            "functions" in behavior.speed &&
            behavior.speed.functions &&
            Array.isArray(behavior.speed.functions)
        ) {
            for (const func of behavior.speed.functions) {
                if (func.function && func.start !== undefined) {
                    const startSpeed = func.function.p0 || 1;
                    const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
                    particleSystem.addVelocityGradient(func.start, startSpeed);
                    if (func.function.p3 !== undefined) {
                        particleSystem.addVelocityGradient(Math.min(func.start + 0.5, 1), endSpeed);
                    }
                }
            }
        } else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
            const speedValue = valueParser.parseIntervalValue(behavior.speed);
            particleSystem.addVelocityGradient(0, speedValue.min);
            particleSystem.addVelocityGradient(1, speedValue.max);
        }
    }
}

/**
 * Apply SpeedOverLife behavior to SolidParticle
 */
export function applySpeedOverLifeSPS(particle: SolidParticle, behavior: VFXSpeedOverLifeBehavior, lifeRatio: number, valueParser: VFXValueParser): void {
    if (!behavior.speed) {
        return;
    }

    let speedMultiplier = 1;

    if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
        speedMultiplier = interpolateGradientKeys(behavior.speed.keys, lifeRatio, extractNumberFromValue);
    } else if (
        typeof behavior.speed === "object" &&
        behavior.speed !== null &&
        "functions" in behavior.speed &&
        behavior.speed.functions &&
        Array.isArray(behavior.speed.functions)
    ) {
        // Handle functions (simplified - use first function)
        const func = behavior.speed.functions[0];
        if (func && func.function && func.start !== undefined) {
            const startSpeed = func.function.p0 || 1;
            const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
            const t = Math.max(0, Math.min(1, (lifeRatio - func.start) / 0.5));
            speedMultiplier = startSpeed + (endSpeed - startSpeed) * t;
        }
    } else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
        const speedValue = valueParser.parseIntervalValue(behavior.speed);
        speedMultiplier = speedValue.min + (speedValue.max - speedValue.min) * lifeRatio;
    }

    // Apply speed modifier to velocity
    const startSpeed = particle.props?.startSpeed ?? 1;
    const speedModifier = particle.props?.speedModifier ?? 1;
    const newSpeedModifier = speedModifier * speedMultiplier;
    particle.props = particle.props || {};
    particle.props.speedModifier = newSpeedModifier;

    // Update velocity magnitude
    const velocityLength = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y + particle.velocity.z * particle.velocity.z);
    if (velocityLength > 0) {
        const newLength = startSpeed * newSpeedModifier;
        const scale = newLength / velocityLength;
        particle.velocity.scaleInPlace(scale);
    }
}
