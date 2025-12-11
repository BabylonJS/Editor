import type { Particle } from "@babylonjs/core/Particles/particle";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { VFXRotationBySpeedBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Extended Particle interface for custom behaviors
 */
interface ExtendedParticle extends Particle {
    startSpeed?: number;
}

/**
 * Apply RotationBySpeed behavior to Particle
 */
export function applyRotationBySpeedPS(particle: ExtendedParticle, behavior: VFXRotationBySpeedBehavior, currentSpeed: number, _particleSystem: ParticleSystem, valueParser: VFXValueParser): void {
    if (!behavior.angularVelocity) {
        return;
    }

    // angularVelocity can be VFXValue (constant/interval) or object with keys
    let angularSpeed = 0;
    if (typeof behavior.angularVelocity === "object" && behavior.angularVelocity !== null && "keys" in behavior.angularVelocity && Array.isArray(behavior.angularVelocity.keys) && behavior.angularVelocity.keys.length > 0) {
        const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
        const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
        const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
        angularSpeed = interpolateGradientKeys(behavior.angularVelocity.keys, speedRatio, extractNumberFromValue);
    } else {
        const angularVel = valueParser.parseIntervalValue(behavior.angularVelocity);
        angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * 0.5; // Use middle value
    }

    particle.angle += angularSpeed * 0.016; // Assuming ~60fps
}

/**
 * Apply RotationBySpeed behavior to SolidParticle
 */
export function applyRotationBySpeedSPS(particle: SolidParticle, behavior: VFXRotationBySpeedBehavior, currentSpeed: number, valueParser: VFXValueParser, updateSpeed: number = 0.016): void {
    if (!behavior.angularVelocity) {
        return;
    }

    // angularVelocity can be VFXValue (constant/interval) or object with keys
    let angularSpeed = 0;
    if (typeof behavior.angularVelocity === "object" && behavior.angularVelocity !== null && "keys" in behavior.angularVelocity && Array.isArray(behavior.angularVelocity.keys) && behavior.angularVelocity.keys.length > 0) {
        const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
        const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
        const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
        angularSpeed = interpolateGradientKeys(behavior.angularVelocity.keys, speedRatio, extractNumberFromValue);
    } else {
        const angularVel = valueParser.parseIntervalValue(behavior.angularVelocity);
        angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * 0.5; // Use middle value
    }

    // SolidParticle uses rotation.z for 2D rotation
    particle.rotation.z += angularSpeed * updateSpeed;
}

