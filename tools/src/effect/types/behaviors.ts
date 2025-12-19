import type { Value } from "./values";
import type { IGradientKey } from "./gradients";
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
/**
 * Color function - unified structure for all color-related behaviors
 */
export interface IColorFunction {
	colorFunctionType: "Gradient" | "ConstantColor" | "ColorRange" | "RandomColor" | "RandomColorBetweenGradient";
	data: {
		color?: { r: number; g: number; b: number; a: number };
		colorA?: { r: number; g: number; b: number; a: number };
		colorB?: { r: number; g: number; b: number; a: number };
		colorKeys?: IGradientKey[];
		alphaKeys?: IGradientKey[];
		gradient1?: {
			colorKeys?: IGradientKey[];
			alphaKeys?: IGradientKey[];
		};
		gradient2?: {
			colorKeys?: IGradientKey[];
			alphaKeys?: IGradientKey[];
		};
	};
}

export interface IColorOverLifeBehavior {
	type: "ColorOverLife";
	color: IColorFunction;
}

export interface ISizeOverLifeBehavior {
	type: "SizeOverLife";
	size?: {
		keys?: IGradientKey[];
		functions?: Array<{
			start: number;
			function: {
				p0?: number;
				p3?: number;
			};
		}>;
	};
}

export interface IRotationOverLifeBehavior {
	type: "RotationOverLife" | "Rotation3DOverLife";
	angularVelocity?: Value;
}

export interface IForceOverLifeBehavior {
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

export interface IGravityForceBehavior {
	type: "GravityForce";
	gravity?: Value;
}

export interface ISpeedOverLifeBehavior {
	type: "SpeedOverLife";
	speed?:
		| {
				keys?: IGradientKey[];
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

export interface IFrameOverLifeBehavior {
	type: "FrameOverLife";
	frame?:
		| {
				keys?: IGradientKey[];
		  }
		| Value;
}

export interface ILimitSpeedOverLifeBehavior {
	type: "LimitSpeedOverLife";
	maxSpeed?: Value;
	speed?: Value | { keys?: IGradientKey[] };
	dampen?: Value;
}

export interface IColorBySpeedBehavior {
	type: "ColorBySpeed";
	color: IColorFunction;
	minSpeed?: Value;
	maxSpeed?: Value;
	speedRange?: { min: number; max: number };
}

export interface ISizeBySpeedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: IGradientKey[];
	};
	minSpeed?: Value;
	maxSpeed?: Value;
}

export interface IRotationBySpeedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: Value;
	minSpeed?: Value;
	maxSpeed?: Value;
}

export interface IOrbitOverLifeBehavior {
	type: "OrbitOverLife";
	center?: {
		x?: number;
		y?: number;
		z?: number;
	};
	radius?: Value | { keys?: IGradientKey[] };
	speed?: Value;
}

export type Behavior =
	| IColorOverLifeBehavior
	| ISizeOverLifeBehavior
	| IRotationOverLifeBehavior
	| IForceOverLifeBehavior
	| IGravityForceBehavior
	| ISpeedOverLifeBehavior
	| IFrameOverLifeBehavior
	| ILimitSpeedOverLifeBehavior
	| IColorBySpeedBehavior
	| ISizeBySpeedBehavior
	| IRotationBySpeedBehavior
	| IOrbitOverLifeBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors
