import { ReactNode } from "react";

export type FunctionType = "ConstantValue" | "IntervalValue" | "PiecewiseBezier" | "Vector3Function";
export type ColorFunctionType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColorBetweenGradient";

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
	properties: IBehaviorProperty[];
	component?: (props: { behavior: any; onChange: () => void }) => ReactNode;
}

export const BehaviorRegistry: { [key: string]: IBehaviorDefinition } = {
	ApplyForce: {
		type: "ApplyForce",
		label: "Apply Force",
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
	Noise: {
		type: "Noise",
		label: "Noise",
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
	TurbulenceField: {
		type: "TurbulenceField",
		label: "Turbulence Field",
		properties: [
			{ name: "scale", type: "vector3", label: "Scale", default: { x: 1, y: 1, z: 1 } },
			{ name: "octaves", type: "number", label: "Octaves", default: 1 },
			{ name: "velocityMultiplier", type: "vector3", label: "Velocity Multiplier", default: { x: 1, y: 1, z: 1 } },
			{ name: "timeScale", type: "vector3", label: "Time Scale", default: { x: 1, y: 1, z: 1 } },
		],
	},
	GravityForce: {
		type: "GravityForce",
		label: "Gravity Force",
		properties: [
			{ name: "center", type: "vector3", label: "Center", default: { x: 0, y: 0, z: 0 } },
			{ name: "magnitude", type: "number", label: "Magnitude", default: 1.0 },
		],
	},
	ColorOverLife: {
		type: "ColorOverLife",
		label: "Color Over Life",
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
	RotationOverLife: {
		type: "RotationOverLife",
		label: "Rotation Over Life",
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
	Rotation3DOverLife: {
		type: "Rotation3DOverLife",
		label: "Rotation 3D Over Life",
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
	SizeOverLife: {
		type: "SizeOverLife",
		label: "Size Over Life",
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
	ColorBySpeed: {
		type: "ColorBySpeed",
		label: "Color By Speed",
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
	RotationBySpeed: {
		type: "RotationBySpeed",
		label: "Rotation By Speed",
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
	SizeBySpeed: {
		type: "SizeBySpeed",
		label: "Size By Speed",
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
	SpeedOverLife: {
		type: "SpeedOverLife",
		label: "Speed Over Life",
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
	FrameOverLife: {
		type: "FrameOverLife",
		label: "Frame Over Life",
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
	ForceOverLife: {
		type: "ForceOverLife",
		label: "Force Over Life",
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
	OrbitOverLife: {
		type: "OrbitOverLife",
		label: "Orbit Over Life",
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
	WidthOverLength: {
		type: "WidthOverLength",
		label: "Width Over Length",
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
	ChangeEmitDirection: {
		type: "ChangeEmitDirection",
		label: "Change Emit Direction",
		properties: [{ name: "angle", type: "number", label: "Angle", default: 0.0 }],
	},
	EmitSubParticleSystem: {
		type: "EmitSubParticleSystem",
		label: "Emit Sub Particle System",
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
	LimitSpeedOverLife: {
		type: "LimitSpeedOverLife",
		label: "Limit Speed Over Life",
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

export function getBehaviorDefinition(type: string): IBehaviorDefinition | undefined {
	return BehaviorRegistry[type];
}

export function createDefaultBehaviorData(type: string): any {
	const definition = BehaviorRegistry[type];
	if (!definition) {
		return { type };
	}

	const data: any = { type };
	for (const prop of definition.properties) {
		if (prop.type === "function") {
			// Initialize function with default type
			data[prop.name] = {
				functionType: prop.functionTypes?.[0] || "ConstantValue",
				data: {},
			};
			// Set default value for ConstantValue
			if (data[prop.name].functionType === "ConstantValue") {
				data[prop.name].data.value = prop.default !== undefined ? prop.default : 1.0;
			} else if (data[prop.name].functionType === "IntervalValue") {
				data[prop.name].data.min = 0;
				data[prop.name].data.max = 1;
			}
		} else if (prop.type === "colorFunction") {
			// Initialize color function with default type
			data[prop.name] = {
				colorFunctionType: prop.colorFunctionTypes?.[0] || "ConstantColor",
				data: {},
			};
		} else if (prop.default !== undefined) {
			if (prop.type === "vector3") {
				// Store as object, will be converted to Vector3 in behavior-properties.tsx
				data[prop.name] = { x: prop.default.x, y: prop.default.y, z: prop.default.z };
			} else if (prop.type === "range") {
				data[prop.name] = { min: prop.default.min, max: prop.default.max };
			} else {
				data[prop.name] = prop.default;
			}
		}
	}
	return data;
}
