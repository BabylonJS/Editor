import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { VFXForceOverLifeBehavior, VFXGravityForceBehavior } from "../types/behaviors";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply ForceOverLife behavior to ParticleSystem
 */
export function applyForceOverLifePS(particleSystem: ParticleSystem, behavior: VFXForceOverLifeBehavior, valueParser: VFXValueParser): void {
    if (behavior.force) {
        const forceX = behavior.force.x !== undefined ? valueParser.parseConstantValue(behavior.force.x) : 0;
        const forceY = behavior.force.y !== undefined ? valueParser.parseConstantValue(behavior.force.y) : 0;
        const forceZ = behavior.force.z !== undefined ? valueParser.parseConstantValue(behavior.force.z) : 0;
        if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
            particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
        }
    } else if (behavior.x !== undefined || behavior.y !== undefined || behavior.z !== undefined) {
        const forceX = behavior.x !== undefined ? valueParser.parseConstantValue(behavior.x) : 0;
        const forceY = behavior.y !== undefined ? valueParser.parseConstantValue(behavior.y) : 0;
        const forceZ = behavior.z !== undefined ? valueParser.parseConstantValue(behavior.z) : 0;
        if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
            particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
        }
    }
}

/**
 * Apply GravityForce behavior to ParticleSystem
 */
export function applyGravityForcePS(particleSystem: ParticleSystem, behavior: VFXGravityForceBehavior, valueParser: VFXValueParser): void {
    if (behavior.gravity !== undefined) {
        const gravity = valueParser.parseConstantValue(behavior.gravity);
        particleSystem.gravity = new Vector3(0, -gravity, 0);
    }
}

