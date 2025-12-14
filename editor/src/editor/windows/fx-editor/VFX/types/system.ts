import { TransformNode, AbstractMesh, Particle, SolidParticle } from "babylonjs";
import type { VFXParticleSystem } from "../systems/VFXParticleSystem";
import type { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";

/**
 * Common interface for all VFX particle systems
 * Provides type-safe access to common properties and methods
 */
export interface IVFXSystem {
	/** System name */
	name: string;
	/** Get the parent node (mesh or emitter) for hierarchy operations */
	getParentNode(): AbstractMesh | TransformNode | null;
	/** Start the particle system */
	start(): void;
	/** Stop the particle system */
	stop(): void;
	/** Dispose the particle system */
	dispose(): void;
}

/**
 * Extended Particle type with system reference
 * Used for behaviors that need access to the particle system
 * Uses intersection type to add custom property without conflicting with base type
 */
export type ParticleWithSystem = Particle & {
	particleSystem?: VFXParticleSystem;
};

/**
 * Extended SolidParticle type with system reference
 * Used for behaviors that need access to the solid particle system
 * Uses intersection type to add custom property without conflicting with base type
 */
export type SolidParticleWithSystem = SolidParticle & {
	system?: VFXSolidParticleSystem;
};

/**
 * Type guard to check if a system implements IVFXSystem
 */
export function isVFXSystem(system: unknown): system is IVFXSystem {
	return (
		typeof system === "object" &&
		system !== null &&
		"getParentNode" in system &&
		typeof (system as IVFXSystem).getParentNode === "function" &&
		"start" in system &&
		typeof (system as IVFXSystem).start === "function" &&
		"stop" in system &&
		typeof (system as IVFXSystem).stop === "function"
	);
}
