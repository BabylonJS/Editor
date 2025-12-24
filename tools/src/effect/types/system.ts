import { TransformNode, AbstractMesh, Particle, SolidParticle } from "babylonjs";
import type { EffectParticleSystem } from "../systems/effectParticleSystem";
import type { EffectSolidParticleSystem } from "../systems/effectSolidParticleSystem";

/**
 * Common interface for all  particle systems
 * Provides type-safe access to common properties and methods
 */
export interface ISystem {
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
	particleSystem?: EffectParticleSystem;
};

/**
 * Extended SolidParticle type with system reference
 * Used for behaviors that need access to the solid particle system
 * Uses intersection type to add custom property without conflicting with base type
 */
export type SolidParticleWithSystem = SolidParticle & {
	system?: EffectSolidParticleSystem;
};

/**
 * Type guard to check if a system implements ISystem
 */
export function isSystem(system: unknown): system is ISystem {
	return (
		typeof system === "object" &&
		system !== null &&
		"getParentNode" in system &&
		typeof (system as ISystem).getParentNode === "function" &&
		"start" in system &&
		typeof (system as ISystem).start === "function" &&
		"stop" in system &&
		typeof (system as ISystem).stop === "function"
	);
}

/**
 *  Effect Node - represents either a particle system or a group
 */
export interface IEffectNode {
	/** Node name */
	name: string;
	/** Node UUID from original JSON */
	uuid: string;
	/** Particle system (if this is a particle emitter) */
	data: EffectParticleSystem | EffectSolidParticleSystem | TransformNode;
	/** Child nodes */
	children: IEffectNode[];
	/** Node type */
	type: "particle" | "group";
}
