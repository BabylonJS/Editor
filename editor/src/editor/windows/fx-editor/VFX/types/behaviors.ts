import type { VFXValue } from "./values";
import type { VFXGradientKey } from "./gradients";

/**
 * VFX behavior types (converted from Quarks)
 */
export interface VFXColorOverLifeBehavior {
	type: "ColorOverLife";
	color?: {
		color?: {
			keys: VFXGradientKey[];
		};
		alpha?: {
			keys: VFXGradientKey[];
		};
		keys?: VFXGradientKey[];
	};
}

export interface VFXSizeOverLifeBehavior {
	type: "SizeOverLife";
	size?: {
		keys?: VFXGradientKey[];
		functions?: Array<{
			start: number;
			function: {
				p0?: number;
				p3?: number;
			};
		}>;
	};
}

export interface VFXRotationOverLifeBehavior {
	type: "RotationOverLife" | "Rotation3DOverLife";
	angularVelocity?: VFXValue;
}

export interface VFXForceOverLifeBehavior {
	type: "ForceOverLife" | "ApplyForce";
	force?: {
		x?: VFXValue;
		y?: VFXValue;
		z?: VFXValue;
	};
	x?: VFXValue;
	y?: VFXValue;
	z?: VFXValue;
}

export interface VFXGravityForceBehavior {
	type: "GravityForce";
	gravity?: VFXValue;
}

export interface VFXSpeedOverLifeBehavior {
	type: "SpeedOverLife";
	speed?:
		| {
				keys?: VFXGradientKey[];
				functions?: Array<{
					start: number;
					function: {
						p0?: number;
						p3?: number;
					};
				}>;
		  }
		| VFXValue;
}

export interface VFXFrameOverLifeBehavior {
	type: "FrameOverLife";
	frame?:
		| {
				keys?: VFXGradientKey[];
		  }
		| VFXValue;
}

export interface VFXLimitSpeedOverLifeBehavior {
	type: "LimitSpeedOverLife";
	maxSpeed?: VFXValue;
	speed?: VFXValue | { keys?: VFXGradientKey[] };
	dampen?: VFXValue;
}

export interface VFXColorBySpeedBehavior {
	type: "ColorBySpeed";
	color?: {
		keys: VFXGradientKey[];
	};
	minSpeed?: VFXValue;
	maxSpeed?: VFXValue;
}

export interface VFXSizeBySpeedBehavior {
	type: "SizeBySpeed";
	size?: {
		keys: VFXGradientKey[];
	};
	minSpeed?: VFXValue;
	maxSpeed?: VFXValue;
}

export interface VFXRotationBySpeedBehavior {
	type: "RotationBySpeed";
	angularVelocity?: VFXValue;
	minSpeed?: VFXValue;
	maxSpeed?: VFXValue;
}

export interface VFXOrbitOverLifeBehavior {
	type: "OrbitOverLife";
	center?: {
		x?: number;
		y?: number;
		z?: number;
	};
	radius?: VFXValue | { keys?: VFXGradientKey[] };
	speed?: VFXValue;
}

export type VFXBehavior =
	| VFXColorOverLifeBehavior
	| VFXSizeOverLifeBehavior
	| VFXRotationOverLifeBehavior
	| VFXForceOverLifeBehavior
	| VFXGravityForceBehavior
	| VFXSpeedOverLifeBehavior
	| VFXFrameOverLifeBehavior
	| VFXLimitSpeedOverLifeBehavior
	| VFXColorBySpeedBehavior
	| VFXSizeBySpeedBehavior
	| VFXRotationBySpeedBehavior
	| VFXOrbitOverLifeBehavior
	| { type: string; [key: string]: unknown }; // Fallback for unknown behaviors
