import type { Value } from "./values";
import type { GradientKey } from "./gradients";
import { Particle, ParticleSystem, SolidParticle, SolidParticleSystem } from "babylonjs";

/**
 * Per-particle behavior function for ParticleSystem
 * Behavior config is captured in closure, only particle is needed
 */
export type PerParticleBehaviorFunction = (particle: Particle) => void;

/**
 * Per-particle behavior function for SolidParticleSystem
 * Behavior config is captured in closure, only particle is needed
 */
export type PerSolidParticleBehaviorFunction = (particle: SolidParticle) => void;

/**
 * System-level behavior function (applied once during initialization)
 * Takes only system and behavior config - all data comes from system
 */
export type SystemBehaviorFunction = (system: ParticleSystem | SolidParticleSystem, behavior: Behavior) => void;

/**
 *  behavior types (converted from Quarks)
 */
export interface ColorOverLifeBehavior {
	type: "ColorOverLife";
	color?: {
		color?: {
			keys: GradientKey[];
		};
		alpha?: {
			keys: GradientKey[];
		};
		keys?: GradientKey[];
	};
}

export interface SizeOverLifeBehavior {
	type: "SizeOverLife";
	size?: {
		keys?: GradientKey[];
		functions?: Array<{
			start: number;
			function: {
				p0?: number;
				p3?: number;
			};
		}>;
	};
}

export interface RotationOverLifeBehavior {
	type: "RotationOverLife" | "Rotation3DOverLife";
	angularVelocity?: Value;
}

export interface ForceOverLifeBehavior {
	type: "ForceOverLife" | "ApplyForce";
	force?: {
		x?: Value;
		y?: Value;
		z?: Value;
	};
	x?: Value;
	y?: Value;
	z?: Value;
}

export interface GravityForceBehavior {
	type: "GravityForce";
	gravity?: Value;
}

export interface SpeedOverLifeBehavior {
	type: "SpeedOverLife";
	speed?:
		| {
				keys?: GradientKey[];
				functions?: Array<{
					start: number;
					function: {
						p0?: number;
						p3?: number;
					};
				}>;
		  }
		| Value;
}

export interface FrameOverLifeBehavior {
	type: "FrameOverLife";
	frame?:
		| {
				keys?: GradientKey[];
		  }
		| Value;
}

export interface LimitSpeedOverLifeBehavior {
	type: "LimitSpeedOverLife";
	maxSpeed?: Value;
	speed?: Value | { keys?: GradientKey[] };
	dampen?: Value;
}

export interface ColorBySpeedBehavior {
	type: "ColorBySpeed";
	color?: {
		keys: GradientKey[];
	};
	minSpeed?: Value;
	maxSpeed?: Value;
}

export interface SizeBySpeedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: GradientKey[];
	};
	minSpeed?: Value;
	maxSpeed?: Value;
}

export interface RotationBySpeedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: Value;
	minSpeed?: Value;
	maxSpeed?: Value;
}

export interface OrbitOverLifeBehavior {
	type: "OrbitOverLife";
	center?: {
		x?: number;
		y?: number;
		z?: number;
	};
	radius?: Value | { keys?: GradientKey[] };
	speed?: Value;
}

export type Behavior =
	| ColorOverLifeBehavior
	| SizeOverLifeBehavior
	| RotationOverLifeBehavior
	| ForceOverLifeBehavior
	| GravityForceBehavior
	| SpeedOverLifeBehavior
	| FrameOverLifeBehavior
	| LimitSpeedOverLifeBehavior
	| ColorBySpeedBehavior
	| SizeBySpeedBehavior
	| RotationBySpeedBehavior
	| OrbitOverLifeBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors
