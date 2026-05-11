import { Color4 } from "@babylonjs/core/Maths/math.color";

export type Value = any;
export type Color = any;
export type Rotation = any;
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

export interface IConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IIntervalValue {
	type: "IntervalValue";
	min: number;
	max: number;
}

export interface IEulerRotation {
	type: "Euler";
	angleX?: Value;
	angleY?: Value;
	angleZ?: Value;
	order?: string;
}

export interface IAxisAngleRotation {
	type: "AxisAngle";
	x?: Value;
	y?: Value;
	z?: Value;
	angle?: Value;
}

export interface IRandomQuatRotation {
	type: "RandomQuat";
}

export function parseConstantValue(value: Value, fallback: number = 0): number {
	if (typeof value === "number") {
		return value;
	}
	if (!value || typeof value !== "object") {
		return fallback;
	}
	if (value.type === "ConstantValue") {
		return Number(value.value ?? fallback);
	}
	if (value.type === "IntervalValue") {
		return Number(((value.min ?? value.a ?? fallback) + (value.max ?? value.b ?? fallback)) * 0.5);
	}
	if (value.functionType === "ConstantValue") {
		return Number(value.data?.value ?? fallback);
	}
	if (value.functionType === "IntervalValue") {
		return Number(((value.data?.min ?? fallback) + (value.data?.max ?? fallback)) * 0.5);
	}
	return fallback;
}

export function parseIntervalValue(value: Value, fallback: number = 0): { min: number; max: number } {
	if (!value || typeof value !== "object") {
		return { min: fallback, max: fallback };
	}
	if (value.type === "IntervalValue") {
		return {
			min: Number(value.min ?? value.a ?? fallback),
			max: Number(value.max ?? value.b ?? fallback),
		};
	}
	if (value.functionType === "IntervalValue") {
		return {
			min: Number(value.data?.min ?? fallback),
			max: Number(value.data?.max ?? fallback),
		};
	}
	const constant = parseConstantValue(value, fallback);
	return { min: constant, max: constant };
}

export function parseConstantColor(color: Color): Color4 {
	if (color instanceof Color4) {
		return color;
	}
	if (color?.type === "ConstantColor" && Array.isArray(color.value)) {
		return new Color4(color.value[0], color.value[1], color.value[2], color.value[3]);
	}
	if (color?.type === "ColorRange" && color.colorA?.length >= 4) {
		return new Color4(color.colorA[0], color.colorA[1], color.colorA[2], color.colorA[3]);
	}
	if (color?.type === "Gradient" && color.colorKeys?.length) {
		const first = color.colorKeys[0]?.value ?? [1, 1, 1, 1];
		return new Color4(first[0], first[1], first[2], first[3]);
	}
	return new Color4(1, 1, 1, 1);
}
