import type { Particle } from "@babylonjs/core/Particles/particle";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { VFXSizeBySpeedBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Extended Particle interface for custom behaviors
 */
interface ExtendedParticle extends Particle {
    startSpeed?: number;
    startSize?: number;
}

/**
 * Apply SizeBySpeed behavior to Particle
 */
export function applySizeBySpeedPS(particle: ExtendedParticle, behavior: VFXSizeBySpeedBehavior, currentSpeed: number, valueParser: VFXValueParser): void {
    if (!behavior.size || !behavior.size.keys) {
        return;
    }

    const sizeKeys = behavior.size.keys;
    const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
    const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
    const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

    const sizeMultiplier = interpolateGradientKeys(sizeKeys, speedRatio, extractNumberFromValue);
    const startSize = particle.startSize || particle.size || 1;
    particle.size = startSize * sizeMultiplier;
}

/**
 * Apply SizeBySpeed behavior to SolidParticle
 */
export function applySizeBySpeedSPS(particle: SolidParticle, behavior: VFXSizeBySpeedBehavior, currentSpeed: number, valueParser: VFXValueParser): void {
    if (!behavior.size || !behavior.size.keys) {
        return;
    }

    const sizeKeys = behavior.size.keys;
    const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
    const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
    const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

    const sizeMultiplier = interpolateGradientKeys(sizeKeys, speedRatio, extractNumberFromValue);
    const startSize = particle.props?.startSize ?? 1;
    const newSize = startSize * sizeMultiplier;
    particle.scaling.setAll(newSize);
}

