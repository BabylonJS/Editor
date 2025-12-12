import { Particle, SolidParticle, ParticleSystem, SolidParticleSystem } from "babylonjs";
import type { VFXBehavior } from "./behaviors";

/**
 * Per-particle behavior function for ParticleSystem
 * Takes only particle and behavior config - all data comes from particle
 */
export type VFXPerParticleBehaviorFunction = (particle: Particle, behavior: VFXBehavior) => void;

/**
 * Per-particle behavior function for SolidParticleSystem
 * Takes only particle and behavior config - all data comes from particle
 */
export type VFXPerSolidParticleBehaviorFunction = (particle: SolidParticle, behavior: VFXBehavior) => void;

/**
 * System-level behavior function (applied once during initialization)
 * Takes only system and behavior config - all data comes from system
 */
export type VFXSystemBehaviorFunction = (system: ParticleSystem | SolidParticleSystem, behavior: VFXBehavior) => void;
