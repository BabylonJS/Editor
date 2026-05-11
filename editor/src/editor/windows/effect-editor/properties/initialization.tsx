import { ReactNode } from "react";
import { Color4 } from "@babylonjs/core/Maths/math.color";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { parseConstantColor, type Color, type Rotation, type Value } from "../types";
import type { IQuarksNode } from "../quarks-bridge";
import { EffectValueEditor, type IVec3Function } from "../editors/value";
import { EffectColorEditor } from "../editors/color";
import {
	Bezier,
	ColorRange,
	ConstantColor,
	ConstantValue,
	Gradient,
	IntervalValue,
	ParticleSystem as QuarksParticleSystem,
	PiecewiseBezier,
	RandomColor,
	RandomColorBetweenGradient,
	Vector3 as QuarksVector3,
	Vector3Function,
	Vector4 as QuarksVector4,
} from "babylon.quarks";

export interface IEffectEditorParticleInitializationPropertiesProps {
	nodeData: IQuarksNode;
	onChange?: () => void;
}

type InitializationUiFallback = {
	minAngularSpeed: number;
	maxAngularSpeed: number;
	minScaleX: number;
	maxScaleX: number;
	minScaleY: number;
	maxScaleY: number;
};

const fallbackState = new WeakMap<QuarksParticleSystem, InitializationUiFallback>();

function getFallbackState(system: QuarksParticleSystem): InitializationUiFallback {
	const existing = fallbackState.get(system);
	if (existing) {
		return existing;
	}
	const created: InitializationUiFallback = {
		minAngularSpeed: 0,
		maxAngularSpeed: 0,
		minScaleX: 1,
		maxScaleX: 1,
		minScaleY: 1,
		maxScaleY: 1,
	};
	fallbackState.set(system, created);
	return created;
}

function createValueGenerator(value: Value): any {
	if (typeof value === "number") return new ConstantValue(value);
	if (!value || typeof value !== "object") return new ConstantValue(0);
	if (value.type === "ConstantValue") return new ConstantValue(Number(value.value ?? 0));
	if (value.type === "IntervalValue") return new IntervalValue(Number(value.min ?? value.a ?? 0), Number(value.max ?? value.b ?? 0));
	if (value.type === "PiecewiseBezier") {
		const functions = Array.isArray(value.functions) ? value.functions : [];
		const curves = functions
			.map((entry: any) => {
				const fn = entry?.function;
				if (!fn) return null;
				return [new Bezier(Number(fn.p0 ?? 0), Number(fn.p1 ?? 0), Number(fn.p2 ?? 0), Number(fn.p3 ?? 0)), Number(entry?.start ?? 0)] as [Bezier, number];
			})
			.filter((entry): entry is [Bezier, number] => !!entry);
		return new PiecewiseBezier(curves.length > 0 ? curves : [[new Bezier(0, 0, 0, 0), 0]]);
	}
	return new ConstantValue(0);
}

function readValueGenerator(generator: any): Value {
	if (!generator || typeof generator !== "object" || typeof generator.toJSON !== "function") {
		return { type: "ConstantValue", value: 0 };
	}
	const json = generator.toJSON();
	if (json?.type === "ConstantValue") return { type: "ConstantValue", value: Number(json.value ?? 0) };
	if (json?.type === "IntervalValue") return { type: "IntervalValue", min: Number(json.a ?? json.min ?? 0), max: Number(json.b ?? json.max ?? 0) };
	if (json?.type === "PiecewiseBezier") return { type: "PiecewiseBezier", functions: json.functions ?? [] };
	return { type: "ConstantValue", value: 0 };
}

function toVector4(value: any): QuarksVector4 {
	if (value instanceof Color4) {
		return new QuarksVector4(value.r, value.g, value.b, value.a);
	}
	if (Array.isArray(value) && value.length >= 4) {
		return new QuarksVector4(Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3]));
	}
	if (value && typeof value === "object") {
		return new QuarksVector4(Number(value.r ?? value.x ?? 1), Number(value.g ?? value.y ?? 1), Number(value.b ?? value.z ?? 1), Number(value.a ?? value.w ?? 1));
	}
	return new QuarksVector4(1, 1, 1, 1);
}

function createColorGenerator(value: Color): any {
	if (!value || typeof value !== "object") return new ConstantColor(new QuarksVector4(1, 1, 1, 1));
	if (value.type === "ConstantColor") return new ConstantColor(toVector4(value.value ?? value.color));
	if (value.type === "ColorRange") return new ColorRange(toVector4(value.colorA ?? value.a), toVector4(value.colorB ?? value.b));
	if (value.type === "RandomColor") return new RandomColor(toVector4(value.colorA ?? value.a), toVector4(value.colorB ?? value.b));
	if (value.type === "Gradient") {
		const colorKeys = (value.colorKeys ?? []).map((key: any) => [new QuarksVector3(Number(key.value?.[0] ?? 1), Number(key.value?.[1] ?? 1), Number(key.value?.[2] ?? 1)), Number(key.pos ?? 0)] as [QuarksVector3, number]);
		const alphaKeys = (value.alphaKeys ?? []).map((key: any) => [Number(key.value ?? 1), Number(key.pos ?? 0)] as [number, number]);
		return new Gradient(colorKeys, alphaKeys);
	}
	if (value.type === "RandomColorBetweenGradient") {
		return new RandomColorBetweenGradient(createColorGenerator({ type: "Gradient", ...(value.gradient1 ?? {}) }), createColorGenerator({ type: "Gradient", ...(value.gradient2 ?? {}) }));
	}
	return new ConstantColor(new QuarksVector4(1, 1, 1, 1));
}

function readColorGenerator(color: any): Color | undefined {
	if (!color || typeof color !== "object" || typeof color.toJSON !== "function") return undefined;
	const json = color.toJSON();
	if (json?.type === "ConstantColor") return { type: "ConstantColor", value: [json.color?.[0] ?? 1, json.color?.[1] ?? 1, json.color?.[2] ?? 1, json.color?.[3] ?? 1] };
	if (json?.type === "ColorRange") return { type: "ColorRange", colorA: json.a ?? [1, 1, 1, 1], colorB: json.b ?? [1, 1, 1, 1] };
	if (json?.type === "RandomColor") return { type: "RandomColor", colorA: json.a ?? [1, 1, 1, 1], colorB: json.b ?? [1, 1, 1, 1] };
	if (json?.type === "Gradient") {
		return {
			type: "Gradient",
			colorKeys: (json.color?.keys ?? []).map((key: any) => ({ pos: Number(key.pos ?? 0), value: [Number(key.value?.[0] ?? 1), Number(key.value?.[1] ?? 1), Number(key.value?.[2] ?? 1), 1] })),
			alphaKeys: (json.alpha?.keys ?? []).map((key: any) => ({ pos: Number(key.pos ?? 0), value: Number(key.value ?? 1) })),
		};
	}
	return undefined;
}

export function EffectEditorParticleInitializationProperties(props: IEffectEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const system = nodeData.data as QuarksParticleSystem;
	const fallback = getFallbackState(system);

	const getStartLife = (): Value => readValueGenerator(system.startLife);
	const setStartLife = (value: Value): void => {
		system.startLife = createValueGenerator(value);
		onChange();
	};

	const getStartSize = (): Value | IVec3Function => {
		const json = (system.startSize as any)?.toJSON?.();
		if (json?.type === "Vector3Function" || json?.type === "Vec3Function") {
			return {
				type: "Vec3Function",
				x: readValueGenerator(json.x),
				y: readValueGenerator(json.y),
				z: readValueGenerator(json.z),
			};
		}
		return readValueGenerator(system.startSize);
	};
	const setStartSize = (value: Value | IVec3Function): void => {
		if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
			system.startSize = new Vector3Function(createValueGenerator(value.x), createValueGenerator(value.y), createValueGenerator(value.z));
		} else {
			system.startSize = createValueGenerator(value as Value);
		}
		onChange();
	};

	const getStartSpeed = (): Value => readValueGenerator(system.startSpeed);
	const setStartSpeed = (value: Value): void => {
		system.startSpeed = createValueGenerator(value);
		onChange();
	};

	const getStartColor = (): Color | undefined => readColorGenerator(system.startColor);
	const setStartColor = (value: Color): void => {
		const color = parseConstantColor(value);
		color.toLinearSpaceToRef(color);
		system.startColor = createColorGenerator(value ?? { type: "ConstantColor", value: [color.r, color.g, color.b, color.a] });
		onChange();
	};

	const getStartRotation = (): Rotation => ({ type: "Euler", angleZ: readValueGenerator(system.startRotation), order: "xyz" });
	const setStartRotation = (value: Rotation): void => {
		if (typeof value === "object" && "type" in value && value.type === "Euler" && value.angleZ) {
			system.startRotation = createValueGenerator(value.angleZ as Value);
		} else {
			system.startRotation = createValueGenerator(value as Value);
		}
		onChange();
	};

	const getAngularSpeed = (): Value => ({ type: "IntervalValue", min: fallback.minAngularSpeed, max: fallback.maxAngularSpeed });
	const setAngularSpeed = (value: Value): void => {
		const parsed = readValueGenerator(createValueGenerator(value));
		fallback.minAngularSpeed = Number((parsed as any).min ?? 0);
		fallback.maxAngularSpeed = Number((parsed as any).max ?? (parsed as any).min ?? 0);
		onChange();
	};

	const getScaleX = (): Value => ({ type: "IntervalValue", min: fallback.minScaleX, max: fallback.maxScaleX });
	const setScaleX = (value: Value): void => {
		const parsed = readValueGenerator(createValueGenerator(value));
		fallback.minScaleX = Number((parsed as any).min ?? 1);
		fallback.maxScaleX = Number((parsed as any).max ?? (parsed as any).min ?? 1);
		onChange();
	};

	const getScaleY = (): Value => ({ type: "IntervalValue", min: fallback.minScaleY, max: fallback.maxScaleY });
	const setScaleY = (value: Value): void => {
		const parsed = readValueGenerator(createValueGenerator(value));
		fallback.minScaleY = Number((parsed as any).min ?? 1);
		fallback.maxScaleY = Number((parsed as any).max ?? (parsed as any).min ?? 1);
		onChange();
	};

	return (
		<>
			<EditorInspectorBlockField><div className="px-2">Start Life</div><EffectValueEditor value={getStartLife()} onChange={setStartLife} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} /></EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Start Size</div><EffectValueEditor value={getStartSize()} onChange={setStartSize} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vec3Function"]} min={0} step={0.01} /></EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Scale X</div><EffectValueEditor value={getScaleX()} onChange={setScaleX} availableTypes={["ConstantValue", "IntervalValue"]} min={0} step={0.01} /></EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Scale Y</div><EffectValueEditor value={getScaleY()} onChange={setScaleY} availableTypes={["ConstantValue", "IntervalValue"]} min={0} step={0.01} /></EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Start Speed</div><EffectValueEditor value={getStartSpeed()} onChange={setStartSpeed} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} /></EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Start Color</div><EffectColorEditor value={getStartColor()} onChange={setStartColor} /></EditorInspectorBlockField>
			<EditorInspectorBlockField>
				<div className="px-2">Start Rotation</div>
				{(() => {
					const rotation = getStartRotation();
					const angleZ = rotation && typeof rotation === "object" && "type" in rotation && rotation.type === "Euler" && rotation.angleZ ? rotation.angleZ : { type: "IntervalValue" as const, min: 0, max: 0 };
					return <EffectValueEditor value={angleZ} onChange={(newAngleZ) => setStartRotation({ type: "Euler", angleZ: newAngleZ as Value, order: "xyz" })} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} step={0.1} />;
				})()}
			</EditorInspectorBlockField>
			<EditorInspectorBlockField><div className="px-2">Angular Speed</div><EffectValueEditor value={getAngularSpeed()} onChange={setAngularSpeed} availableTypes={["ConstantValue", "IntervalValue"]} step={0.1} /></EditorInspectorBlockField>
		</>
	);
}
