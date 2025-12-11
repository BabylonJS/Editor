import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { VFXRotationOverLifeBehavior } from "../types/behaviors";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply RotationOverLife behavior to ParticleSystem
 */
export function applyRotationOverLifePS(particleSystem: ParticleSystem, behavior: VFXRotationOverLifeBehavior, valueParser: VFXValueParser): void {
    if (behavior.angularVelocity) {
        const angularVel = valueParser.parseIntervalValue(behavior.angularVelocity);
        particleSystem.minAngularSpeed = angularVel.min;
        particleSystem.maxAngularSpeed = angularVel.max;
    }
}

/**
 * Apply RotationOverLife behavior to SolidParticle
 */
export function applyRotationOverLifeSPS(particle: SolidParticle, behavior: VFXRotationOverLifeBehavior, lifeRatio: number, valueParser: VFXValueParser, updateSpeed: number = 0.016): void {
    if (!behavior.angularVelocity) {
        return;
    }

    const angularVel = valueParser.parseIntervalValue(behavior.angularVelocity);
    const angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * lifeRatio;

    // Apply rotation around Z axis (2D rotation)
    // SolidParticle uses rotation.z for 2D rotation
    particle.rotation.z += angularSpeed * updateSpeed;
}

