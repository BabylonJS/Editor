import type { Particle } from "@babylonjs/core/Particles/particle";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Context for per-particle behavior functions
 */
export interface VFXPerParticleContext {
    lifeRatio: number;
    startSpeed: number;
    startSize: number;
    startColor: { r: number; g: number; b: number; a: number };
    updateSpeed: number;
    valueParser: VFXValueParser;
}

/**
 * Per-particle behavior function for ParticleSystem
 */
export type VFXPerParticleBehaviorFunction = (particle: Particle, context: VFXPerParticleContext) => void;

/**
 * Per-particle behavior function for SolidParticleSystem
 */
export type VFXPerSolidParticleBehaviorFunction = (particle: SolidParticle, context: VFXPerParticleContext) => void;

/**
 * System-level behavior function (applied once during initialization)
 */
export type VFXSystemBehaviorFunction = (particleSystem: ParticleSystem, valueParser: VFXValueParser) => void;

