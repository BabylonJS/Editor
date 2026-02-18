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

import { type IEffectNode, EffectParticleSystem, EffectSolidParticleSystem, BEHAVIOR_TYPES, type BehaviorKind, type Behavior } from "babylonjs-editor-tools";
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
	nodeData: IEffectNode;
	onChange: () => void;
}

export function EffectEditorBehaviorsProperties(props: IEffectEditorBehaviorsPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const system = nodeData.data;
	if (!(system instanceof EffectParticleSystem || system instanceof EffectSolidParticleSystem)) {
		return null;
	}

	const behaviorConfigs: EditorBehavior[] = system.behaviorConfigs ?? [];

	const applyBehaviors = (): void => {
		system.setBehaviors(behaviorConfigs);
		onChange();
	};

	const handleAddBehavior = (behaviorType: string): void => {
		const newBehavior: EditorBehavior = { ...createDefaultBehaviorData(behaviorType), id: `behavior-${Date.now()}-${Math.random()}` };
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
