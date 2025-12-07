import { ReactNode } from "react";
import { Vector3, Color4 } from "babylonjs";

import { EditorInspectorNumberField } from "../../../../layout/inspector/fields/number";
import { EditorInspectorVectorField } from "../../../../layout/inspector/fields/vector";
import { EditorInspectorColorField } from "../../../../layout/inspector/fields/color";
import { EditorInspectorSwitchField } from "../../../../layout/inspector/fields/switch";
import { EditorInspectorStringField } from "../../../../layout/inspector/fields/string";
import { EditorInspectorListField } from "../../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../../layout/inspector/fields/block";

import { getBehaviorDefinition } from "./registry";
import { FunctionEditor } from "./function-editor";
import { ColorFunctionEditor } from "./color-function-editor";

export interface IBehaviorPropertiesProps {
	behavior: any;
	onChange: () => void;
}

export function BehaviorProperties(props: IBehaviorPropertiesProps): ReactNode {
	const { behavior, onChange } = props;
	const definition = getBehaviorDefinition(behavior.type);

	if (!definition) {
		return null;
	}

	return (
		<>
			{definition.properties.map((prop) => {
				if (prop.type === "vector3") {
					// Ensure vector3 property exists and is a Vector3 or object
					if (!behavior[prop.name]) {
						const defaultVal = prop.default || { x: 0, y: 0, z: 0 };
						behavior[prop.name] = new Vector3(defaultVal.x, defaultVal.y, defaultVal.z);
					} else if (!(behavior[prop.name] instanceof Vector3)) {
						// Convert to Vector3 if it's an object
						const obj = behavior[prop.name];
						behavior[prop.name] = new Vector3(obj.x || 0, obj.y || 0, obj.z || 0);
					}
					return <EditorInspectorVectorField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;
				}

				if (prop.type === "number") {
					if (behavior[prop.name] === undefined) {
						behavior[prop.name] = prop.default !== undefined ? prop.default : 0;
					}
					return <EditorInspectorNumberField key={prop.name} object={behavior} property={prop.name} label={prop.label} step={0.1} onChange={onChange} />;
				}

				if (prop.type === "color") {
					if (!behavior[prop.name]) {
						behavior[prop.name] = prop.default ? new Color4(prop.default.r, prop.default.g, prop.default.b, prop.default.a) : new Color4(1, 1, 1, 1);
					}
					return <EditorInspectorColorField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;
				}

				if (prop.type === "range") {
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
				}

				if (prop.type === "boolean") {
					if (behavior[prop.name] === undefined) {
						behavior[prop.name] = prop.default !== undefined ? prop.default : false;
					}
					return <EditorInspectorSwitchField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;
				}

				if (prop.type === "string") {
					if (behavior[prop.name] === undefined) {
						behavior[prop.name] = prop.default !== undefined ? prop.default : "";
					}
					return <EditorInspectorStringField key={prop.name} object={behavior} property={prop.name} label={prop.label} onChange={onChange} />;
				}

				if (prop.type === "enum") {
					if (behavior[prop.name] === undefined) {
						behavior[prop.name] = prop.default !== undefined ? prop.default : prop.enumItems?.[0]?.value ?? 0;
					}
					if (!prop.enumItems || prop.enumItems.length === 0) {
						return null;
					}
					return (
						<EditorInspectorListField
							key={prop.name}
							object={behavior}
							property={prop.name}
							label={prop.label}
							items={prop.enumItems}
							onChange={onChange}
						/>
					);
				}

				if (prop.type === "colorFunction") {
					// Initialize color function value if not set
					if (!behavior[prop.name]) {
						behavior[prop.name] = {
							colorFunctionType: prop.colorFunctionTypes?.[0] || "ConstantColor",
							data: {},
						};
					}
					return (
						<ColorFunctionEditor
							key={prop.name}
							value={behavior[prop.name]}
							onChange={onChange}
							label={prop.label}
						/>
					);
				}

				if (prop.type === "function") {
					// Initialize function value if not set
					if (!behavior[prop.name]) {
						behavior[prop.name] = {
							functionType: prop.functionTypes?.[0] || "ConstantValue",
							data: {},
						};
					}
					return (
						<FunctionEditor
							key={prop.name}
							value={behavior[prop.name]}
							onChange={onChange}
							availableTypes={prop.functionTypes}
							label={prop.label}
						/>
					);
				}

				return null;
			})}
		</>
	);
}

