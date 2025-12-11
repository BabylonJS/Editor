import type { ParticleSystem } from "../../particleSystem";
import type { VFXLimitSpeedOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply LimitSpeedOverLife behavior to ParticleSystem
 */
export function applyLimitSpeedOverLifePS(particleSystem: ParticleSystem, behavior: VFXLimitSpeedOverLifeBehavior, valueParser: VFXValueParser): void {
    if (behavior.dampen !== undefined) {
        const dampen = valueParser.parseConstantValue(behavior.dampen);
        particleSystem.limitVelocityDamping = dampen;
    }

    if (behavior.maxSpeed !== undefined) {
        const speedLimit = valueParser.parseConstantValue(behavior.maxSpeed);
        particleSystem.addLimitVelocityGradient(0, speedLimit);
        particleSystem.addLimitVelocityGradient(1, speedLimit);
    } else if (behavior.speed !== undefined) {
        if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
            for (const key of behavior.speed.keys) {
                const pos = key.pos ?? key.time ?? 0;
                const val = key.value;
                if (val !== undefined && pos !== undefined) {
                    const numVal = extractNumberFromValue(val);
                    particleSystem.addLimitVelocityGradient(pos, numVal);
                }
            }
        } else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
            const speedLimit = valueParser.parseConstantValue(behavior.speed);
            particleSystem.addLimitVelocityGradient(0, speedLimit);
            particleSystem.addLimitVelocityGradient(1, speedLimit);
        }
    }
}

