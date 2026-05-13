import { toColor4, toConstantNumber, toInterval, type EditorColor, type EditorRotation, type EditorValue } from "./quarks-adapter";

export type Value = EditorValue;
export type Color = EditorColor;
export type Rotation = EditorRotation;
export type Behavior = Record<string, any>;
export type BehaviorKind = "system" | "perParticle";

export const BEHAVIOR_TYPES = {
	ApplyForce: "ApplyForce",
	Noise: "Noise",
	TurbulenceField: "TurbulenceField",
	GravityForce: "GravityForce",
	ColorOverLife: "ColorOverLife",
	RotationOverLife: "RotationOverLife",
	Rotation3DOverLife: "Rotation3DOverLife",
	SizeOverLife: "SizeOverLife",
	ColorBySpeed: "ColorBySpeed",
	RotationBySpeed: "RotationBySpeed",
	SizeBySpeed: "SizeBySpeed",
	SpeedOverLife: "SpeedOverLife",
	FrameOverLife: "FrameOverLife",
	ForceOverLife: "ForceOverLife",
	OrbitOverLife: "OrbitOverLife",
	WidthOverLength: "WidthOverLength",
	ChangeEmitDirection: "ChangeEmitDirection",
	EmitSubParticleSystem: "EmitSubParticleSystem",
	LimitSpeedOverLife: "LimitSpeedOverLife",
} as const;

export function parseConstantValue(value: Value, fallback: number = 0): number {
	return toConstantNumber(value, fallback);
}

export function parseIntervalValue(value: Value, fallback: number = 0): { min: number; max: number } {
	return toInterval(value, fallback);
}

export function parseConstantColor(color: Color) {
	return toColor4(color);
}
