import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
	AxisAngleGenerator,
	Bezier,
	ColorRange,
	ConstantColor,
	ConstantValue,
	EulerGenerator,
	Gradient,
	IntervalValue,
	PiecewiseBezier,
	RandomColor,
	RandomColorBetweenGradient,
	RandomQuatGenerator,
	Vector3 as QuarksVector3,
	Vector3Function,
	Vector4 as QuarksVector4,
	type ColorGenerator,
	type FunctionColorGenerator,
	type FunctionValueGenerator,
	type RotationGenerator,
	type ValueGenerator,
	type Vector3Generator,
} from "babylon.quarks";

export type EditorColorArray = [number, number, number, number];
export type EditorValue = IEditorConstantValue | IEditorIntervalValue | IEditorPiecewiseBezier;
export type EditorVector3Value = { type: "Vec3Function"; x: EditorValue; y: EditorValue; z: EditorValue };
export type EditorColor = IEditorConstantColor | IEditorColorRange | IEditorGradient | IEditorRandomColor | IEditorRandomColorBetweenGradient;
export type EditorRotation = IEditorEulerRotation | IEditorAxisAngleRotation | IEditorRandomQuatRotation;

export interface IEditorConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IEditorIntervalValue {
	type: "IntervalValue";
	a: number;
	b: number;
}

export interface IEditorPiecewiseBezier {
	type: "PiecewiseBezier";
	functions: Array<{ function: { p0: number; p1: number; p2: number; p3: number }; start: number }>;
}

export interface IEditorConstantColor {
	type: "ConstantColor";
	color: EditorColorArray;
}

export interface IEditorColorRange {
	type: "ColorRange";
	a: EditorColorArray;
	b: EditorColorArray;
}

export interface IEditorGradient {
	type: "Gradient";
	colorKeys: Array<{ pos: number; value: EditorColorArray }>;
	alphaKeys: Array<{ pos: number; value: number }>;
}

export interface IEditorRandomColor {
	type: "RandomColor";
	a: EditorColorArray;
	b: EditorColorArray;
}

export interface IEditorRandomColorBetweenGradient {
	type: "RandomColorBetweenGradient";
	gradient1: IEditorGradient;
	gradient2: IEditorGradient;
}

export interface IEditorEulerRotation {
	type: "Euler";
	angleX?: EditorValue;
	angleY?: EditorValue;
	angleZ?: EditorValue;
	order?: "xyz" | "zyx";
}

export interface IEditorAxisAngleRotation {
	type: "AxisAngle";
	x?: EditorValue;
	y?: EditorValue;
	z?: EditorValue;
	angle?: EditorValue;
}

export interface IEditorRandomQuatRotation {
	type: "RandomQuat";
}

const ZERO_VALUE: EditorValue = { type: "ConstantValue", value: 0 };
const WHITE_COLOR: EditorColorArray = [1, 1, 1, 1];

export function createConstantValue(value: number): EditorValue {
	return { type: "ConstantValue", value };
}

export function createIntervalValue(a: number, b: number): EditorValue {
	return { type: "IntervalValue", a, b };
}

export function createLinearBezierValue(value: number): EditorValue {
	return {
		type: "PiecewiseBezier",
		functions: [{ function: { p0: value, p1: value, p2: value, p3: value }, start: 0 }],
	};
}

export function toColor4(color: EditorColor | undefined): Color4 {
	const value = color ? readConstantColor(color) : WHITE_COLOR;
	return new Color4(value[0], value[1], value[2], value[3]);
}

export function toConstantNumber(value: EditorValue | EditorVector3Value | undefined, fallback = 0): number {
	if (!value || value.type === "Vec3Function") {
		return fallback;
	}
	if (value.type === "ConstantValue") {
		return value.value;
	}
	if (value.type === "IntervalValue") {
		return (value.a + value.b) * 0.5;
	}
	const first = value.functions[0]?.function;
	return first ? (first.p0 + first.p1 + first.p2 + first.p3) * 0.25 : fallback;
}

export function toInterval(value: EditorValue | undefined, fallback = 0): { min: number; max: number } {
	if (!value) {
		return { min: fallback, max: fallback };
	}
	if (value.type === "IntervalValue") {
		return { min: value.a, max: value.b };
	}
	const constant = toConstantNumber(value, fallback);
	return { min: constant, max: constant };
}

export function toQuarksVector3(value: Vector3 | { x: number; y: number; z: number } | undefined, fallback: [number, number, number] = [0, 0, 0]): QuarksVector3 {
	if (value instanceof Vector3) {
		return new QuarksVector3(value.x, value.y, value.z);
	}
	if (value) {
		return new QuarksVector3(Number(value.x), Number(value.y), Number(value.z));
	}
	return new QuarksVector3(fallback[0], fallback[1], fallback[2]);
}

export function editorValueToGenerator(value: EditorValue): ValueGenerator | FunctionValueGenerator {
	if (value.type === "ConstantValue") {
		return new ConstantValue(value.value);
	}
	if (value.type === "IntervalValue") {
		return new IntervalValue(value.a, value.b);
	}
	return new PiecewiseBezier(value.functions.map((entry) => [new Bezier(entry.function.p0, entry.function.p1, entry.function.p2, entry.function.p3), entry.start]));
}

export function editorValueToFunctionGenerator(value: EditorValue): FunctionValueGenerator {
	if (value.type === "PiecewiseBezier") {
		return editorValueToGenerator(value) as FunctionValueGenerator;
	}
	const constant = toConstantNumber(value);
	return new PiecewiseBezier([[new Bezier(constant, constant, constant, constant), 0]]);
}

export function editorValueToIntervalGenerator(value: EditorValue): IntervalValue {
	if (value.type === "IntervalValue") {
		return new IntervalValue(value.a, value.b);
	}
	const constant = toConstantNumber(value);
	return new IntervalValue(constant, constant);
}

export function editorValueToVector3Generator(value: EditorValue | EditorVector3Value): ValueGenerator | FunctionValueGenerator | Vector3Generator {
	if (value.type !== "Vec3Function") {
		return editorValueToGenerator(value);
	}
	return new Vector3Function(editorValueToGenerator(value.x), editorValueToGenerator(value.y), editorValueToGenerator(value.z));
}

export function generatorToEditorValue(generator: unknown): EditorValue {
	const json = toJson(generator);
	if (json.type === "ConstantValue") {
		return { type: "ConstantValue", value: Number(json.value) };
	}
	if (json.type === "IntervalValue") {
		return { type: "IntervalValue", a: Number(json.a), b: Number(json.b) };
	}
	if (json.type === "PiecewiseBezier") {
		return {
			type: "PiecewiseBezier",
			functions: (json.functions ?? []).map((entry: any) => ({
				function: {
					p0: Number(entry.function.p0),
					p1: Number(entry.function.p1),
					p2: Number(entry.function.p2),
					p3: Number(entry.function.p3),
				},
				start: Number(entry.start),
			})),
		};
	}
	return ZERO_VALUE;
}

export function generatorToEditorVector3Value(generator: unknown): EditorValue | EditorVector3Value {
	const json = toJson(generator);
	if (json.type !== "Vector3Function" && json.type !== "Vec3Function") {
		return generatorToEditorValue(generator);
	}
	return {
		type: "Vec3Function",
		x: generatorToEditorValue({ toJSON: () => json.x }),
		y: generatorToEditorValue({ toJSON: () => json.y }),
		z: generatorToEditorValue({ toJSON: () => json.z }),
	};
}

export function editorColorToGenerator(color: EditorColor): ColorGenerator | FunctionColorGenerator {
	if (color.type === "ConstantColor") {
		return new ConstantColor(toQuarksVector4(color.color));
	}
	if (color.type === "ColorRange") {
		return new ColorRange(toQuarksVector4(color.a), toQuarksVector4(color.b));
	}
	if (color.type === "RandomColor") {
		return new RandomColor(toQuarksVector4(color.a), toQuarksVector4(color.b));
	}
	if (color.type === "Gradient") {
		return new Gradient(
			color.colorKeys.map((key) => [new QuarksVector3(key.value[0], key.value[1], key.value[2]), key.pos]),
			color.alphaKeys.map((key) => [key.value, key.pos])
		);
	}
	return new RandomColorBetweenGradient(editorColorToGenerator(color.gradient1) as Gradient, editorColorToGenerator(color.gradient2) as Gradient);
}

export function colorGeneratorToEditorColor(generator: unknown): EditorColor {
	const json = toJson(generator);
	if (json.type === "ConstantColor") {
		return { type: "ConstantColor", color: toColorArray(json.color) };
	}
	if (json.type === "ColorRange") {
		return { type: "ColorRange", a: toColorArray(json.a), b: toColorArray(json.b) };
	}
	if (json.type === "RandomColor") {
		return { type: "RandomColor", a: toColorArray(json.a), b: toColorArray(json.b) };
	}
	if (json.type === "Gradient") {
		return gradientJsonToEditor(json);
	}
	if (json.type === "RandomColorBetweenGradient") {
		return {
			type: "RandomColorBetweenGradient",
			gradient1: gradientJsonToEditor(json.gradient1),
			gradient2: gradientJsonToEditor(json.gradient2),
		};
	}
	return { type: "ConstantColor", color: WHITE_COLOR };
}

export function editorRotationToGenerator(rotation: EditorRotation): RotationGenerator | ValueGenerator | FunctionValueGenerator {
	if (rotation.type === "RandomQuat") {
		return new RandomQuatGenerator();
	}
	if (rotation.type === "AxisAngle") {
		const axis = new QuarksVector3(toConstantNumber(rotation.x, 0), toConstantNumber(rotation.y, 0), toConstantNumber(rotation.z, 1));
		return new AxisAngleGenerator(axis, editorValueToGenerator(rotation.angle ?? ZERO_VALUE));
	}
	return new EulerGenerator(
		editorValueToGenerator(rotation.angleX ?? ZERO_VALUE),
		editorValueToGenerator(rotation.angleY ?? ZERO_VALUE),
		editorValueToGenerator(rotation.angleZ ?? ZERO_VALUE),
		rotation.order === "zyx" ? "ZYX" : "XYZ"
	);
}

export function rotationGeneratorToEditorRotation(generator: unknown): EditorRotation {
	const json = toJson(generator);
	if (json.type === "Euler") {
		return {
			type: "Euler",
			angleX: generatorToEditorValue({ toJSON: () => json.angleX }),
			angleY: generatorToEditorValue({ toJSON: () => json.angleY }),
			angleZ: generatorToEditorValue({ toJSON: () => json.angleZ }),
			order: String(json.order ?? "XYZ").toLowerCase() === "zyx" ? "zyx" : "xyz",
		};
	}
	if (json.type === "AxisAngle") {
		return {
			type: "AxisAngle",
			x: createConstantValue(Number(json.axis?.x ?? json.axis?.[0] ?? 0)),
			y: createConstantValue(Number(json.axis?.y ?? json.axis?.[1] ?? 0)),
			z: createConstantValue(Number(json.axis?.z ?? json.axis?.[2] ?? 1)),
			angle: generatorToEditorValue({ toJSON: () => json.angle }),
		};
	}
	if (json.type === "RandomQuat") {
		return { type: "RandomQuat" };
	}
	return { type: "Euler", angleZ: generatorToEditorValue(generator), order: "xyz" };
}

function toJson(value: unknown): any {
	if (value && typeof value === "object" && typeof (value as { toJSON?: unknown }).toJSON === "function") {
		return (value as { toJSON: () => any }).toJSON();
	}
	return value ?? {};
}

function toQuarksVector4(value: EditorColorArray): QuarksVector4 {
	return new QuarksVector4(value[0], value[1], value[2], value[3]);
}

function toColorArray(value: unknown): EditorColorArray {
	if (value instanceof Color4) {
		return [value.r, value.g, value.b, value.a];
	}
	if (Array.isArray(value)) {
		return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
	}
	if (value && typeof value === "object") {
		const color = value as { r?: number; g?: number; b?: number; a?: number; x?: number; y?: number; z?: number; w?: number };
		return [Number(color.r ?? color.x), Number(color.g ?? color.y), Number(color.b ?? color.z), Number(color.a ?? color.w)];
	}
	return WHITE_COLOR;
}

function readConstantColor(color: EditorColor): EditorColorArray {
	if (color.type === "ConstantColor") {
		return color.color;
	}
	if (color.type === "ColorRange" || color.type === "RandomColor") {
		return color.a;
	}
	if (color.type === "Gradient") {
		return color.colorKeys[0]?.value ?? WHITE_COLOR;
	}
	return color.gradient1.colorKeys[0]?.value ?? WHITE_COLOR;
}

function gradientJsonToEditor(json: any): IEditorGradient {
	return {
		type: "Gradient",
		colorKeys: (json.color?.keys ?? []).map((key: any) => ({ pos: Number(key.pos), value: toColorArray([key.value?.[0], key.value?.[1], key.value?.[2], 1]) })),
		alphaKeys: (json.alpha?.keys ?? []).map((key: any) => ({ pos: Number(key.pos), value: Number(key.value) })),
	};
}
