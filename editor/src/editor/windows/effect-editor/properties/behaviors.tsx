import { ReactNode } from "react";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineTrash } from "react-icons/hi2";
import { IoAddSharp } from "react-icons/io5";

import {
	ApplyForce,
	AxisAngleGenerator,
	Bezier,
	ChangeEmitDirection,
	ColorBySpeed,
	ColorRange,
	ColorOverLife,
	ConstantColor,
	ConstantValue,
	EmitSubParticleSystem,
	EulerGenerator,
	ForceOverLife,
	FrameOverLife,
	Gradient,
	GravityForce,
	IntervalValue,
	LimitSpeedOverLife,
	Noise,
	OrbitOverLife,
	ParticleSystem as QuarksParticleSystem,
	PiecewiseBezier,
	RandomColor,
	RandomColorBetweenGradient,
	RandomQuatGenerator,
	Rotation3DOverLife,
	RotationBySpeed,
	RotationOverLife,
	SizeBySpeed,
	SizeOverLife,
	SpeedOverLife,
	SubParticleEmitMode,
	TurbulenceField,
	Vector3 as QuarksVector3,
	Vector3Function,
	Vector4 as QuarksVector4,
	WidthOverLength,
	type Behavior as RuntimeBehavior,
} from "babylon.quarks";
import { BEHAVIOR_TYPES, type BehaviorKind, type Behavior } from "../types";
import type { IQuarksNode } from "../quarks-bridge";
import { FunctionEditor, ColorFunctionEditor } from "../editors";

// Types
export type FunctionType = "ConstantValue" | "IntervalValue" | "PiecewiseBezier" | "Vector3Function";
export type ColorFunctionType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColor" | "RandomColorBetweenGradient";

export interface IBehaviorProperty {
	name: string;
	type: "vector3" | "number" | "color" | "range" | "boolean" | "string" | "function" | "enum" | "colorFunction";
	label: string;
	default?: any;
	enumItems?: Array<{ text: string; value: any }>;
	functionTypes?: FunctionType[];
	colorFunctionTypes?: ColorFunctionType[];
}

export interface IBehaviorDefinition {
	type: string;
	label: string;
	kind?: BehaviorKind;
	properties: IBehaviorProperty[];
}

/** Behavior config with optional editor-only id (for React keys). Runtime ignores id. */
export type EditorBehavior = Behavior & { id?: string };
const behaviorUiState = new WeakMap<QuarksParticleSystem, EditorBehavior[]>();

function createBehaviorId(): string {
	return `behavior-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toColorArray(value: any, fallback: [number, number, number, number] = [1, 1, 1, 1]): [number, number, number, number] {
	if (value instanceof Color4) {
		return [value.r, value.g, value.b, value.a];
	}
	if (Array.isArray(value) && value.length >= 4) {
		return [Number(value[0] ?? 1), Number(value[1] ?? 1), Number(value[2] ?? 1), Number(value[3] ?? 1)];
	}
	if (value && typeof value === "object") {
		if ("r" in value && "g" in value && "b" in value) {
			return [Number(value.r), Number(value.g), Number(value.b), Number(value.a ?? 1)];
		}
		if ("x" in value && "y" in value && "z" in value) {
			return [Number(value.x), Number(value.y), Number(value.z), Number((value as any).w ?? 1)];
		}
	}
	return fallback;
}

function normalizeValueJson(value: any): any {
	if (value === undefined || value === null) {
		return { type: "ConstantValue", value: 0 };
	}
	if (typeof value === "number") {
		return { type: "ConstantValue", value };
	}
	if (value?.functionType) {
		const data = value.data ?? {};
		switch (value.functionType) {
			case "ConstantValue":
				return { type: "ConstantValue", value: Number(data.value ?? 0) };
			case "IntervalValue":
				return { type: "IntervalValue", a: Number(data.min ?? 0), b: Number(data.max ?? 0) };
			case "PiecewiseBezier":
				return {
					type: "PiecewiseBezier",
					functions: Array.isArray(data.functions) ? data.functions : [{ function: data.function ?? { p0: 0, p1: 1 / 3, p2: (1 / 3) * 2, p3: 1 }, start: 0 }],
				};
			case "Vector3Function":
				return {
					type: "Vector3Function",
					x: normalizeValueJson(data.x),
					y: normalizeValueJson(data.y),
					z: normalizeValueJson(data.z),
				};
		}
	}
	if (value?.type === "ConstantValue") {
		return { type: "ConstantValue", value: Number(value.value ?? 0) };
	}
	if (value?.type === "IntervalValue") {
		return { type: "IntervalValue", a: Number(value.a ?? value.min ?? 0), b: Number(value.b ?? value.max ?? 0) };
	}
	if (value?.type === "PiecewiseBezier") {
		return {
			type: "PiecewiseBezier",
			functions: Array.isArray(value.functions) ? value.functions : [{ function: value.function ?? { p0: 0, p1: 1 / 3, p2: (1 / 3) * 2, p3: 1 }, start: 0 }],
		};
	}
	if (value?.type === "Vector3Function" || value?.type === "Vec3Function") {
		return { type: "Vector3Function", x: normalizeValueJson(value.x), y: normalizeValueJson(value.y), z: normalizeValueJson(value.z) };
	}
	return value;
}

function normalizeGradientJson(input: any): any {
	const sourceColorKeys = Array.isArray(input?.colorKeys) ? input.colorKeys : [];
	const sourceAlphaKeys = Array.isArray(input?.alphaKeys) ? input.alphaKeys : [];
	const colorKeys = sourceColorKeys.length > 0 ? sourceColorKeys : [{ pos: 0, value: [1, 1, 1, 1] }, { pos: 1, value: [1, 1, 1, 1] }];
	const alphaKeys = sourceAlphaKeys.length > 0 ? sourceAlphaKeys : [{ pos: 0, value: 1 }, { pos: 1, value: 1 }];
	return {
		type: "Gradient",
		color: {
			type: "CLinearFunction",
			subType: "Color",
			keys: colorKeys.map((key: any) => ({
				pos: Number(key?.pos ?? key?.position ?? 0),
				value: toColorArray(key?.value, [0, 0, 0, 1]).slice(0, 3),
			})),
		},
		alpha: {
			type: "CLinearFunction",
			subType: "Number",
			keys: alphaKeys.map((key: any) => ({
				pos: Number(key?.pos ?? key?.position ?? 0),
				value: Number(key?.value ?? 1),
			})),
		},
	};
}

function normalizeColorJson(value: any): any {
	if (!value) {
		return { type: "ConstantColor", color: [1, 1, 1, 1] };
	}
	if (value?.colorFunctionType) {
		const data = value.data ?? {};
		switch (value.colorFunctionType) {
			case "ConstantColor":
				return { type: "ConstantColor", color: toColorArray(data.color) };
			case "ColorRange":
				return { type: "ColorRange", a: toColorArray(data.colorA), b: toColorArray(data.colorB) };
			case "RandomColor":
				return { type: "RandomColor", a: toColorArray(data.colorA), b: toColorArray(data.colorB) };
			case "Gradient":
				return normalizeGradientJson(data);
			case "RandomColorBetweenGradient":
				return {
					type: "RandomColorBetweenGradient",
					gradient1: normalizeGradientJson(data.gradient1),
					gradient2: normalizeGradientJson(data.gradient2),
				};
		}
	}
	if (value?.type === "ConstantColor") {
		return { type: "ConstantColor", color: toColorArray(value.color ?? value.value) };
	}
	if (value?.type === "ColorRange" || value?.type === "RandomColor") {
		return { type: value.type, a: toColorArray(value.a ?? value.colorA), b: toColorArray(value.b ?? value.colorB) };
	}
	if (value?.type === "Gradient") {
		return value.color && value.alpha ? value : normalizeGradientJson(value);
	}
	if (value?.type === "RandomColorBetweenGradient") {
		return {
			type: "RandomColorBetweenGradient",
			gradient1: normalizeColorJson(value.gradient1),
			gradient2: normalizeColorJson(value.gradient2),
		};
	}
	return value;
}

function toQuarksVector3(value: any, fallback: [number, number, number] = [0, 0, 0]): QuarksVector3 {
	if (value instanceof Vector3) {
		return new QuarksVector3(value.x, value.y, value.z);
	}
	if (Array.isArray(value) && value.length >= 3) {
		return new QuarksVector3(Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0));
	}
	if (value && typeof value === "object") {
		return new QuarksVector3(Number(value.x ?? fallback[0]), Number(value.y ?? fallback[1]), Number(value.z ?? fallback[2]));
	}
	return new QuarksVector3(fallback[0], fallback[1], fallback[2]);
}

function toQuarksVector4(value: any, fallback: [number, number, number, number] = [1, 1, 1, 1]): QuarksVector4 {
	const color = toColorArray(value, fallback);
	return new QuarksVector4(color[0], color[1], color[2], color[3]);
}

function toConstantNumber(value: any, fallback: number = 0): number {
	const normalized = normalizeValueJson(value);
	if (normalized?.type === "ConstantValue") {
		return Number(normalized.value ?? fallback);
	}
	if (normalized?.type === "IntervalValue") {
		return (Number(normalized.a ?? 0) + Number(normalized.b ?? 0)) * 0.5;
	}
	return fallback;
}

function toValueGenerator(value: any): any {
	const normalized = normalizeValueJson(value);
	if (normalized?.type === "ConstantValue") {
		return new ConstantValue(Number(normalized.value ?? 0));
	}
	if (normalized?.type === "IntervalValue") {
		return new IntervalValue(Number(normalized.a ?? 0), Number(normalized.b ?? 0));
	}
	if (normalized?.type === "PiecewiseBezier") {
		const curves = (Array.isArray(normalized.functions) ? normalized.functions : [])
			.map((entry: any) => {
				const fn = entry?.function;
				if (!fn) {
					return null;
				}
				const bezier = new Bezier(Number(fn.p0 ?? 0), Number(fn.p1 ?? 0), Number(fn.p2 ?? 0), Number(fn.p3 ?? 0));
				return [bezier, Number(entry?.start ?? 0)] as [Bezier, number];
			})
			.filter((entry): entry is [Bezier, number] => !!entry);
		return new PiecewiseBezier(curves.length > 0 ? curves : [[new Bezier(0, 0, 0, 0), 0]]);
	}
	if (normalized?.type === "Vector3Function") {
		return new Vector3Function(toValueGenerator(normalized.x), toValueGenerator(normalized.y), toValueGenerator(normalized.z));
	}
	return new ConstantValue(Number(value ?? 0));
}

function toFunctionValueGenerator(value: any): any {
	const generator = toValueGenerator(value);
	if (generator?.type === "function") {
		return generator;
	}
	const constant = toConstantNumber(value, 0);
	return new PiecewiseBezier([[new Bezier(constant, constant, constant, constant), 0]]);
}

function toIntervalValueGenerator(value: any): IntervalValue {
	const normalized = normalizeValueJson(value);
	if (normalized?.type === "IntervalValue") {
		return new IntervalValue(Number(normalized.a ?? 0), Number(normalized.b ?? 0));
	}
	const constant = toConstantNumber(value, 0);
	return new IntervalValue(constant, constant);
}

function toColorGenerator(value: any): any {
	const normalized = normalizeColorJson(value);
	if (normalized?.type === "ConstantColor") {
		return new ConstantColor(toQuarksVector4(normalized.color));
	}
	if (normalized?.type === "ColorRange") {
		return new ColorRange(toQuarksVector4(normalized.a), toQuarksVector4(normalized.b));
	}
	if (normalized?.type === "RandomColor") {
		return new RandomColor(toQuarksVector4(normalized.a), toQuarksVector4(normalized.b));
	}
	if (normalized?.type === "Gradient") {
		const colorKeys = Array.isArray(normalized.color?.keys)
			? normalized.color.keys.map((key: any) => [toQuarksVector3(key.value, [1, 1, 1]), Number(key.pos ?? 0)] as [QuarksVector3, number])
			: [];
		const alphaKeys = Array.isArray(normalized.alpha?.keys)
			? normalized.alpha.keys.map((key: any) => [Number(key.value ?? 1), Number(key.pos ?? 0)] as [number, number])
			: [];
		return new Gradient(colorKeys, alphaKeys);
	}
	if (normalized?.type === "RandomColorBetweenGradient") {
		return new RandomColorBetweenGradient(toColorGenerator(normalized.gradient1), toColorGenerator(normalized.gradient2));
	}
	return new ConstantColor(new QuarksVector4(1, 1, 1, 1));
}

function toRotationGenerator(value: any): any {
	const toEulerOrder = (order: string | undefined): "XYZ" | "ZYX" => (order?.toUpperCase() === "ZYX" ? "ZYX" : "XYZ");
	if (!value || typeof value !== "object") {
		return new EulerGenerator(new ConstantValue(0), new ConstantValue(0), new ConstantValue(0), "XYZ");
	}
	if (value.type === "Euler") {
		return new EulerGenerator(toValueGenerator(value.angleX), toValueGenerator(value.angleY), toValueGenerator(value.angleZ), toEulerOrder(value.order));
	}
	if (value.type === "AxisAngle") {
		const axis = new QuarksVector3(toConstantNumber(value.x, 0), toConstantNumber(value.y, 0), toConstantNumber(value.z, 1));
		return new AxisAngleGenerator(axis, toValueGenerator(value.angle));
	}
	if (value.type === "RandomQuat") {
		return new RandomQuatGenerator();
	}
	return new EulerGenerator(new ConstantValue(0), new ConstantValue(0), toValueGenerator(value), "XYZ");
}

function createBehaviorInstance(config: EditorBehavior, system: QuarksParticleSystem): RuntimeBehavior | null {
	switch (config.type) {
		case BEHAVIOR_TYPES.ApplyForce:
			return new ApplyForce(toQuarksVector3(config.direction, [0, 1, 0]), toValueGenerator(config.magnitude));
		case BEHAVIOR_TYPES.Noise:
			return new Noise(toValueGenerator(config.frequency), toValueGenerator(config.power), toValueGenerator(config.positionAmount), toValueGenerator(config.rotationAmount));
		case BEHAVIOR_TYPES.TurbulenceField:
			return new TurbulenceField(
				toQuarksVector3(config.scale, [2, 2, 2]),
				Number(config.octaves ?? 1),
				toQuarksVector3(config.velocityMultiplier, [1, 1, 1]),
				toQuarksVector3(config.timeScale, [1, 1, 1])
			);
		case BEHAVIOR_TYPES.GravityForce:
			return new GravityForce(toQuarksVector3(config.center), Number(config.magnitude ?? 0));
		case BEHAVIOR_TYPES.ColorOverLife:
			return new ColorOverLife(toColorGenerator(config.color) as any);
		case BEHAVIOR_TYPES.RotationOverLife:
			return new RotationOverLife(toValueGenerator(config.angularVelocity));
		case BEHAVIOR_TYPES.Rotation3DOverLife:
			return new Rotation3DOverLife(toRotationGenerator(config.angularVelocity));
		case BEHAVIOR_TYPES.SizeOverLife:
			return new SizeOverLife(toValueGenerator(config.size));
		case BEHAVIOR_TYPES.ColorBySpeed:
			return new ColorBySpeed(toColorGenerator(config.color) as any, toIntervalValueGenerator(config.speedRange));
		case BEHAVIOR_TYPES.RotationBySpeed:
			return new RotationBySpeed(toValueGenerator(config.angularVelocity), toIntervalValueGenerator(config.speedRange));
		case BEHAVIOR_TYPES.SizeBySpeed:
			return new SizeBySpeed(toValueGenerator(config.size), toIntervalValueGenerator(config.speedRange));
		case BEHAVIOR_TYPES.SpeedOverLife:
			return new SpeedOverLife(toFunctionValueGenerator(config.speed));
		case BEHAVIOR_TYPES.FrameOverLife:
			return new FrameOverLife(toFunctionValueGenerator(config.frame));
		case BEHAVIOR_TYPES.ForceOverLife:
			return new ForceOverLife(toValueGenerator(config.x), toValueGenerator(config.y), toValueGenerator(config.z));
		case BEHAVIOR_TYPES.OrbitOverLife:
			return new OrbitOverLife(toValueGenerator(config.orbitSpeed), toQuarksVector3(config.axis, [0, 1, 0]));
		case BEHAVIOR_TYPES.WidthOverLength:
			return new WidthOverLength(toFunctionValueGenerator(config.width));
		case BEHAVIOR_TYPES.ChangeEmitDirection:
			return new ChangeEmitDirection(toValueGenerator(config.angle));
		case BEHAVIOR_TYPES.EmitSubParticleSystem:
			return new EmitSubParticleSystem(system, !!config.useVelocityAsBasis, undefined, Number(config.mode ?? 0) as SubParticleEmitMode, Number(config.emitProbability ?? 1));
		case BEHAVIOR_TYPES.LimitSpeedOverLife:
			return new LimitSpeedOverLife(toFunctionValueGenerator(config.speed), Number(config.dampen ?? 0));
		default:
			return null;
	}
}

function getEditorBehaviors(system: QuarksParticleSystem): EditorBehavior[] {
	const cached = behaviorUiState.get(system);
	if (cached) {
		return cached;
	}
	const created = (system.behaviors ?? []).map((behavior: any) => ({
		...(behavior?.toJSON?.() ?? behavior),
		id: createBehaviorId(),
	}));
	behaviorUiState.set(system, created);
	return created;
}

// Behavior Registry (keys from BEHAVIOR_TYPES; kind = system-level gradients vs per-particle)
export const BehaviorRegistry: { [key: string]: IBehaviorDefinition } = {
	[BEHAVIOR_TYPES.ApplyForce]: {
		type: BEHAVIOR_TYPES.ApplyForce,
		label: "Apply Force",
		kind: "perParticle",
		properties: [
			{ name: "direction", type: "vector3", label: "Direction", default: { x: 0, y: 1, z: 0 } },
			{
				name: "magnitude",
				type: "function",
				label: "Magnitude",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
		],
	},
	[BEHAVIOR_TYPES.Noise]: {
		type: BEHAVIOR_TYPES.Noise,
		label: "Noise",
		kind: "perParticle",
		properties: [
			{
				name: "frequency",
				type: "function",
				label: "Frequency",
				default: 1.0,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
			{
				name: "power",
				type: "function",
				label: "Power",
				default: 1.0,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
			{
				name: "positionAmount",
				type: "function",
				label: "Position Amount",
				default: 1.0,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
			{
				name: "rotationAmount",
				type: "function",
				label: "Rotation Amount",
				default: 0.0,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
		],
	},
	[BEHAVIOR_TYPES.TurbulenceField]: {
		type: BEHAVIOR_TYPES.TurbulenceField,
		label: "Turbulence Field",
		kind: "perParticle",
		properties: [
			{ name: "scale", type: "vector3", label: "Scale", default: { x: 1, y: 1, z: 1 } },
			{ name: "octaves", type: "number", label: "Octaves", default: 1 },
			{ name: "velocityMultiplier", type: "vector3", label: "Velocity Multiplier", default: { x: 1, y: 1, z: 1 } },
			{ name: "timeScale", type: "vector3", label: "Time Scale", default: { x: 1, y: 1, z: 1 } },
		],
	},
	[BEHAVIOR_TYPES.GravityForce]: {
		type: BEHAVIOR_TYPES.GravityForce,
		label: "Gravity Force",
		kind: "perParticle",
		properties: [
			{ name: "center", type: "vector3", label: "Center", default: { x: 0, y: 0, z: 0 } },
			{ name: "magnitude", type: "number", label: "Magnitude", default: 1.0 },
		],
	},
	[BEHAVIOR_TYPES.ColorOverLife]: {
		type: BEHAVIOR_TYPES.ColorOverLife,
		label: "Color Over Life",
		kind: "system",
		properties: [
			{
				name: "color",
				type: "colorFunction",
				label: "Color",
				default: null,
				colorFunctionTypes: ["ConstantColor", "ColorRange", "Gradient", "RandomColorBetweenGradient"],
			},
		],
	},
	[BEHAVIOR_TYPES.RotationOverLife]: {
		type: BEHAVIOR_TYPES.RotationOverLife,
		label: "Rotation Over Life",
		kind: "system",
		properties: [
			{
				name: "angularVelocity",
				type: "function",
				label: "Angular Velocity",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.Rotation3DOverLife]: {
		type: BEHAVIOR_TYPES.Rotation3DOverLife,
		label: "Rotation 3D Over Life",
		kind: "system",
		properties: [
			{
				name: "angularVelocity",
				type: "function",
				label: "Angular Velocity",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.SizeOverLife]: {
		type: BEHAVIOR_TYPES.SizeOverLife,
		label: "Size Over Life",
		kind: "system",
		properties: [
			{
				name: "size",
				type: "function",
				label: "Size",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vector3Function"],
			},
		],
	},
	[BEHAVIOR_TYPES.ColorBySpeed]: {
		type: BEHAVIOR_TYPES.ColorBySpeed,
		label: "Color By Speed",
		kind: "perParticle",
		properties: [
			{
				name: "color",
				type: "colorFunction",
				label: "Color",
				default: null,
				colorFunctionTypes: ["ConstantColor", "ColorRange", "Gradient", "RandomColorBetweenGradient"],
			},
			{ name: "speedRange", type: "range", label: "Speed Range", default: { min: 0, max: 10 } },
		],
	},
	[BEHAVIOR_TYPES.RotationBySpeed]: {
		type: BEHAVIOR_TYPES.RotationBySpeed,
		label: "Rotation By Speed",
		kind: "perParticle",
		properties: [
			{
				name: "angularVelocity",
				type: "function",
				label: "Angular Velocity",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
			{ name: "speedRange", type: "range", label: "Speed Range", default: { min: 0, max: 10 } },
		],
	},
	[BEHAVIOR_TYPES.SizeBySpeed]: {
		type: BEHAVIOR_TYPES.SizeBySpeed,
		label: "Size By Speed",
		kind: "perParticle",
		properties: [
			{
				name: "size",
				type: "function",
				label: "Size",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vector3Function"],
			},
			{ name: "speedRange", type: "range", label: "Speed Range", default: { min: 0, max: 10 } },
		],
	},
	[BEHAVIOR_TYPES.SpeedOverLife]: {
		type: BEHAVIOR_TYPES.SpeedOverLife,
		label: "Speed Over Life",
		kind: "system",
		properties: [
			{
				name: "speed",
				type: "function",
				label: "Speed",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.FrameOverLife]: {
		type: BEHAVIOR_TYPES.FrameOverLife,
		label: "Frame Over Life",
		kind: "system",
		properties: [
			{
				name: "frame",
				type: "function",
				label: "Frame",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.ForceOverLife]: {
		type: BEHAVIOR_TYPES.ForceOverLife,
		label: "Force Over Life",
		kind: "perParticle",
		properties: [
			{
				name: "x",
				type: "function",
				label: "X",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
			{
				name: "y",
				type: "function",
				label: "Y",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
			{
				name: "z",
				type: "function",
				label: "Z",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.OrbitOverLife]: {
		type: BEHAVIOR_TYPES.OrbitOverLife,
		label: "Orbit Over Life",
		kind: "perParticle",
		properties: [
			{
				name: "orbitSpeed",
				type: "function",
				label: "Orbit Speed",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
			{ name: "axis", type: "vector3", label: "Axis", default: { x: 0, y: 1, z: 0 } },
		],
	},
	[BEHAVIOR_TYPES.WidthOverLength]: {
		type: BEHAVIOR_TYPES.WidthOverLength,
		label: "Width Over Length",
		kind: "perParticle",
		properties: [
			{
				name: "width",
				type: "function",
				label: "Width",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
		],
	},
	[BEHAVIOR_TYPES.ChangeEmitDirection]: {
		type: BEHAVIOR_TYPES.ChangeEmitDirection,
		label: "Change Emit Direction",
		kind: "perParticle",
		properties: [
			{
				name: "angle",
				type: "function",
				label: "Angle",
				default: 0.0,
				functionTypes: ["ConstantValue", "IntervalValue"],
			},
		],
	},
	[BEHAVIOR_TYPES.EmitSubParticleSystem]: {
		type: BEHAVIOR_TYPES.EmitSubParticleSystem,
		label: "Emit Sub Particle System",
		kind: "perParticle",
		properties: [
			{ name: "subParticleSystem", type: "string", label: "Sub Particle System", default: "" },
			{ name: "useVelocityAsBasis", type: "boolean", label: "Use Velocity As Basis", default: false },
			{
				name: "mode",
				type: "enum",
				label: "Mode",
				default: 0,
				enumItems: [
					{ text: "Death", value: 0 },
					{ text: "Birth", value: 1 },
					{ text: "Frame", value: 2 },
				],
			},
			{ name: "emitProbability", type: "number", label: "Emit Probability", default: 1.0 },
		],
	},
	[BEHAVIOR_TYPES.LimitSpeedOverLife]: {
		type: BEHAVIOR_TYPES.LimitSpeedOverLife,
		label: "Limit Speed Over Life",
		kind: "system",
		properties: [
			{
				name: "speed",
				type: "function",
				label: "Speed",
				default: null,
				functionTypes: ["ConstantValue", "IntervalValue", "PiecewiseBezier"],
			},
			{ name: "dampen", type: "number", label: "Dampen", default: 0.0 },
		],
	},
};

// Utility functions
export function getBehaviorDefinition(type: string): IBehaviorDefinition | undefined {
	return BehaviorRegistry[type];
}

/** Creates a minimal behavior config for the given type; returned object may be extended with editor-only fields (e.g. id). */
export function createDefaultBehaviorData(type: string): Behavior {
	const definition = BehaviorRegistry[type];
	if (!definition) {
		return { type };
	}

	const data: Record<string, unknown> = { type };
	for (const prop of definition.properties) {
		if (prop.type === "function") {
			const fnData: Record<string, unknown> = {};
			const fnType = prop.functionTypes?.[0] || "ConstantValue";
			if (fnType === "ConstantValue") {
				fnData.value = prop.default !== undefined ? prop.default : 1.0;
			} else if (fnType === "IntervalValue") {
				fnData.min = 0;
				fnData.max = 1;
			}
			data[prop.name] = { functionType: fnType, data: fnData };
		} else if (prop.type === "colorFunction") {
			data[prop.name] = {
				colorFunctionType: prop.colorFunctionTypes?.[0] || "ConstantColor",
				data: {},
			};
		} else if (prop.default !== undefined) {
			if (prop.type === "vector3") {
				data[prop.name] = { x: prop.default.x, y: prop.default.y, z: prop.default.z };
			} else if (prop.type === "range") {
				data[prop.name] = { min: prop.default.min, max: prop.default.max };
			} else {
				data[prop.name] = prop.default;
			}
		}
	}
	return data as Behavior;
}

// Helper function to render a single property (behavior may be mutated with Vector3/Color4 for inspector)
function renderProperty(prop: IBehaviorProperty, behavior: Behavior, onChange: () => void): ReactNode {
	switch (prop.type) {
		case "vector3":
			if (!behavior[prop.name]) {
				const defaultVal = prop.default || { x: 0, y: 0, z: 0 };
				behavior[prop.name] = new Vector3(defaultVal.x, defaultVal.y, defaultVal.z);
			} else if (!(behavior[prop.name] instanceof Vector3)) {
				const obj = behavior[prop.name];
				behavior[prop.name] = new Vector3(obj.x || 0, obj.y || 0, obj.z || 0);
			}
			return <EditorInspectorVectorField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;

		case "number":
			if (behavior[prop.name] === undefined) {
				behavior[prop.name] = prop.default !== undefined ? prop.default : 0;
			}
			return <EditorInspectorNumberField key={prop.name} object={behavior} property={prop.name} label={prop.label} step={0.1} onChange={onChange} />;

		case "color":
			if (!behavior[prop.name]) {
				behavior[prop.name] = prop.default ? new Color4(prop.default.r, prop.default.g, prop.default.b, prop.default.a) : new Color4(1, 1, 1, 1);
			}
			return <EditorInspectorColorField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;

		case "range":
			if (!behavior[prop.name]) {
				behavior[prop.name] = prop.default ? { ...prop.default } : { min: 0, max: 1 };
			}
			return (
				<EditorInspectorBlockField key={prop.name}>
					<div className="px-2">{prop.label}</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={behavior[prop.name]} property="min" label="Min" step={0.1} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={behavior[prop.name]} property="max" label="Max" step={0.1} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
			);

		case "boolean":
			if (behavior[prop.name] === undefined) {
				behavior[prop.name] = prop.default !== undefined ? prop.default : false;
			}
			return <EditorInspectorSwitchField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;

		case "string":
			if (behavior[prop.name] === undefined) {
				behavior[prop.name] = prop.default !== undefined ? prop.default : "";
			}
			return <EditorInspectorStringField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;

		case "enum":
			if (behavior[prop.name] === undefined) {
				behavior[prop.name] = prop.default !== undefined ? prop.default : (prop.enumItems?.[0]?.value ?? 0);
			}
			if (!prop.enumItems || prop.enumItems.length === 0) {
				return null;
			}
			return <EditorInspectorListField key={prop.name} object={behavior} property={prop.name} label={prop.label} items={prop.enumItems} onChange={onChange} />;

		case "colorFunction":
			// All color functions are now stored uniformly in behavior[prop.name]
			if (!behavior[prop.name]) {
				behavior[prop.name] = {
					colorFunctionType: prop.colorFunctionTypes?.[0] || "ConstantColor",
					data: {},
				};
			}
			return <ColorFunctionEditor key={prop.name} value={behavior[prop.name]} onChange={onChange} label={prop.label} />;

		case "function":
			if (!behavior[prop.name]) {
				behavior[prop.name] = {
					functionType: prop.functionTypes?.[0] || "ConstantValue",
					data: {},
				};
			}
			return <FunctionEditor key={prop.name} value={behavior[prop.name]} onChange={onChange} availableTypes={prop.functionTypes} label={prop.label} />;

		default:
			return null;
	}
}

// Component to render behavior properties
interface IBehaviorPropertiesProps {
	behavior: Behavior;
	onChange: () => void;
}

function BehaviorProperties(props: IBehaviorPropertiesProps): ReactNode {
	const { behavior, onChange } = props;
	const definition = getBehaviorDefinition(behavior.type);

	if (!definition) {
		return null;
	}

	return <>{definition.properties.map((prop) => renderProperty(prop, behavior, onChange))}</>;
}

// Main component
export interface IEffectEditorBehaviorsPropertiesProps {
	nodeData: IQuarksNode;
	onChange: () => void;
}

export function EffectEditorBehaviorsProperties(props: IEffectEditorBehaviorsPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const sourceSystem = nodeData.data;
	if (!(sourceSystem instanceof QuarksParticleSystem)) {
		return null;
	}
	const behaviorConfigs: EditorBehavior[] = getEditorBehaviors(sourceSystem);

	const applyBehaviors = (): void => {
		const runtimeBehaviors = behaviorConfigs
			.map((behavior) => createBehaviorInstance(behavior, sourceSystem))
			.filter((behavior): behavior is RuntimeBehavior => !!behavior);
		sourceSystem.behaviors = runtimeBehaviors;
		sourceSystem.neededToUpdateRender = true;
		behaviorUiState.set(sourceSystem, behaviorConfigs);
		onChange();
	};

	const handleAddBehavior = (behaviorType: string): void => {
		const newBehavior: EditorBehavior = { ...createDefaultBehaviorData(behaviorType), id: createBehaviorId() };
		behaviorConfigs.push(newBehavior);
		applyBehaviors();
	};

	const handleRemoveBehavior = (index: number): void => {
		behaviorConfigs.splice(index, 1);
		applyBehaviors();
	};

	const handleBehaviorChange = (): void => {
		applyBehaviors();
	};

	return (
		<>
			{behaviorConfigs.length === 0 && <div className="px-2 text-muted-foreground">No behaviors. Click "Add Behavior" to add one.</div>}
			{behaviorConfigs.map((behavior, index) => {
				const definition = getBehaviorDefinition(behavior.type);
				const title = definition?.label || behavior.type || `Behavior ${index + 1}`;

				return (
					<EditorInspectorSectionField
						key={behavior.id ?? `behavior-${index}`}
						title={
							<div className="flex items-center justify-between w-full">
								<span>{title}</span>
								<Button
									variant="ghost"
									className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										handleRemoveBehavior(index);
									}}
								>
									<HiOutlineTrash className="w-4 h-4" />
								</Button>
							</div>
						}
					>
						<BehaviorProperties behavior={behavior} onChange={handleBehaviorChange} />
					</EditorInspectorSectionField>
				);
			})}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="secondary" className="flex items-center gap-2 w-full">
						<IoAddSharp className="w-6 h-6" /> Add Behavior
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{Object.values(BehaviorRegistry).map((definition) => (
						<DropdownMenuItem key={definition.type} onClick={() => handleAddBehavior(definition.type)}>
							{definition.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
