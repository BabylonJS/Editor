import { Vector2, Vector3, Color3, Color4 } from "babylonjs";

import { Editor } from "../../../main";

export type VisibleInInspectorDecoratorObject = {
	label?: string;
	propertyKey: string;
	configuration: VisibleInInspectorDecoratorConfiguration;
};

export type VisibleInInspectorDecoratorConfiguration = {
	type: string;
	description?: string;

	min?: number;
	max?: number;
	step?: number;

	asDegrees?: boolean;

	noClamp?: boolean;
	noColorPicker?: boolean;

	acceptCubes?: boolean;
	onlyCubes?: boolean;
};

export const scriptValues = "values";

export function computeDefaultValuesForObject(script: any, output: VisibleInInspectorDecoratorObject[]) {
	script[scriptValues] ??= {};

	const attachedScripts = script[scriptValues];
	const existingKeys = Object.keys(attachedScripts);

	// Clean non existing values
	existingKeys.forEach((key) => {
		const existingOutput = output.find((value) => value.propertyKey === key);
		if (!existingOutput) {
			return delete attachedScripts[key];
		}
	});

	output.forEach((value) => {
		switch (value.configuration.type) {
			case "boolean":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? false,
				};
				break;

			case "number":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? value.configuration.min ?? value.configuration.max ?? 0,
				};
				break;

			case "string":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? "",
				};
				break;

			case "vector2":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: [
						attachedScripts[value.propertyKey]?.value[0] ?? value.configuration.min ?? value.configuration.max ?? 0,
						attachedScripts[value.propertyKey]?.value[1] ?? value.configuration.min ?? value.configuration.max ?? 0,
					],
				};
				break;

			case "vector3":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: [
						attachedScripts[value.propertyKey]?.value[0] ?? value.configuration.min ?? value.configuration.max ?? 0,
						attachedScripts[value.propertyKey]?.value[1] ?? value.configuration.min ?? value.configuration.max ?? 0,
						attachedScripts[value.propertyKey]?.value[2] ?? value.configuration.min ?? value.configuration.max ?? 0,
					],
				};
				break;

			case "color3":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: [
						attachedScripts[value.propertyKey]?.value[0] ?? 1,
						attachedScripts[value.propertyKey]?.value[1] ?? 1,
						attachedScripts[value.propertyKey]?.value[2] ?? 1,
					],
				};
				break;

			case "color4":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: [
						attachedScripts[value.propertyKey]?.value[0] ?? 1,
						attachedScripts[value.propertyKey]?.value[1] ?? 1,
						attachedScripts[value.propertyKey]?.value[2] ?? 1,
						attachedScripts[value.propertyKey]?.value[3] ?? 1,
					],
				};
				break;

			case "keymap":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? 0,
				};
				break;

			case "entity":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? null,
				};
				break;

			case "texture":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? null,
				};
				break;

			case "asset":
				attachedScripts[value.propertyKey] = {
					type: value.configuration.type,
					description: value.configuration.description,
					value: attachedScripts[value.propertyKey]?.value ?? null,
				};
				break;
		}
	});
}

export interface IApplyValueToRunningSceneObjectOptions {
	object: any;
	script: any;
	scriptIndex: number;
	value: VisibleInInspectorDecoratorObject;
}

export function applyValueToRunningSceneObject(editor: Editor, options: IApplyValueToRunningSceneObjectOptions) {
	if (!editor.state.enableExperimentalFeatures) {
		return;
	}

	const scene = editor.layout.preview.play.scene;
	if (!scene) {
		return;
	}

	let runningObject: any = null;
	if (options.object.id) {
		runningObject = scene.getNodeById(options.object.id);
	}

	if (!runningObject) {
		return;
	}

	const scriptInstance = runningObject.__editorRunningScripts?.[options.scriptIndex];
	if (!scriptInstance) {
		return;
	}

	switch (options.value.configuration.type) {
		case "boolean":
		case "number":
		case "string":
			scriptInstance.instance[options.value.propertyKey] = options.script[scriptValues][options.value.propertyKey].value;
			break;

		case "vector2":
			scriptInstance.instance[options.value.propertyKey] = Vector2.FromArray(options.script[scriptValues][options.value.propertyKey].value);
			break;
		case "vector3":
			scriptInstance.instance[options.value.propertyKey] = Vector3.FromArray(options.script[scriptValues][options.value.propertyKey].value);
			break;

		case "color3":
			scriptInstance.instance[options.value.propertyKey] = Color3.FromArray(options.script[scriptValues][options.value.propertyKey].value);
			break;
		case "color4":
			scriptInstance.instance[options.value.propertyKey] = Color4.FromArray(options.script[scriptValues][options.value.propertyKey].value);
			break;
	}
}
