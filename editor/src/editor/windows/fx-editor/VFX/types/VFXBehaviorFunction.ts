import { Particle, SolidParticle, ParticleSystem, SolidParticleSystem } from "babylonjs";
import type { VFXBehavior } from "./behaviors";

/**
 * Per-particle behavior function for ParticleSystem
 * Behavior config is captured in closure, only particle is needed
 */
export type VFXPerParticleBehaviorFunction = (particle: Particle) => void;

/**
 * Per-particle behavior function for SolidParticleSystem
 * Behavior config is captured in closure, only particle is needed
 */
export type VFXPerSolidParticleBehaviorFunction = (particle: SolidParticle) => void;

/**
 * System-level behavior function (applied once during initialization)
 * Takes only system and behavior config - all data comes from system
 */
export type VFXSystemBehaviorFunction = (system: ParticleSystem | SolidParticleSystem, behavior: VFXBehavior) => void;
