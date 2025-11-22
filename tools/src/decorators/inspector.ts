import { ISceneDecoratorData } from "./apply";

export type VisibleInInspectorDecoratorType = "number" | "boolean" | "string" | "vector2" | "vector3" | "color3" | "color4" | "entity" | "texture" | "keymap" | "asset";

export type VisibleInInspectorDecoratorConfiguration = {
	type: VisibleInInspectorDecoratorType;
	description?: string;
};

/**
 * Makes the decorated property visible in the editor inspector as a boolean.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (description, etc.).
 */
export function visibleAsBoolean(label?: string, configuration?: Omit<VisibleInInspectorDecoratorConfiguration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "boolean",
			},
		});
	};
}

export type VisibleInInspectorDecoratorStringConfiguration = VisibleInInspectorDecoratorConfiguration & {
	multiline?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as a string.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (description, etc.).
 */
export function visibleAsString(label?: string, configuration?: Omit<VisibleInInspectorDecoratorStringConfiguration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "string",
			},
		});
	};
}

/**
 * Makes the decorated property visible in the editor inspector as a number.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsNumber(label?: string, configuration?: Omit<VisibleInInspectorDecoratorNumberConfiguration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "number",
			},
		});
	};
}

export type VisibleInInspectorDecoratorNumberConfiguration = VisibleInInspectorDecoratorConfiguration & {
	min?: number;
	max?: number;
	step?: number;
};

/**
 * Makes the decorated property visible in the editor inspector as a vector2.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsVector2(label?: string, configuration?: Omit<VisibleInInspectorDecoratorVector2Configuration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "vector2",
			},
		});
	};
}

export type VisibleInInspectorDecoratorVector2Configuration = VisibleInInspectorDecoratorConfiguration & {
	min?: number;
	max?: number;
	step?: number;
	asDegrees?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as a vector3.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsVector3(label?: string, configuration?: Omit<VisibleInInspectorDecoratorVector3Configuration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "vector3",
			},
		});
	};
}

export type VisibleInInspectorDecoratorVector3Configuration = VisibleInInspectorDecoratorConfiguration & {
	min?: number;
	max?: number;
	step?: number;
	asDegrees?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as a color3.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsColor3(label?: string, configuration?: Omit<VisibleInInspectorDecoratorColor3Configuration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "color3",
			},
		});
	};
}

export type VisibleInInspectorDecoratorColor3Configuration = VisibleInInspectorDecoratorConfiguration & {
	noClamp?: boolean;
	noColorPicker?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as a color4.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsColor4(label?: string, configuration?: Omit<VisibleInInspectorDecoratorColor4Configuration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "color4",
			},
		});
	};
}

export type VisibleInInspectorDecoratorColor4Configuration = VisibleInInspectorDecoratorConfiguration & {
	noClamp?: boolean;
	noColorPicker?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as an entity.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param entityType defines the type of entity to be displayed in the inspector (node, sound, animationGroup or particleSystem).
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsEntity(entityType: VisibleAsEntityType, label?: string, configuration?: Omit<VisibleInInspectorDecoratorEntityConfiguration, "type" | "entityType">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				entityType,
				type: "entity",
			} as VisibleInInspectorDecoratorEntityConfiguration,
		});
	};
}

export type VisibleAsEntityType = "node" | "sound" | "animationGroup" | "particleSystem";

export type VisibleInInspectorDecoratorEntityConfiguration = VisibleInInspectorDecoratorConfiguration & {
	entityType?: VisibleAsEntityType;
};

/**
 * Makes the decorated property visible in the editor inspector as a Texture.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (accept cubes, etc.).
 */
export function visibleAsTexture(label?: string, configuration?: Omit<VisibleInInspectorDecoratorTextureConfiguration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "texture",
			},
		});
	};
}

export type VisibleInInspectorDecoratorTextureConfiguration = VisibleInInspectorDecoratorConfiguration & {
	acceptCubes?: boolean;
	onlyCubes?: boolean;
};

/**
 * Makes the decorated property visible in the editor inspector as a KeyMap.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (description, etc.).
 */
export function visibleAsKeyMap(label?: string, configuration?: Omit<VisibleInInspectorDecoratorConfiguration, "type">) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				type: "keymap",
			},
		});
	};
}

export type VisibleInspectorDecoratorAssetPossibleTypes = "json" | "material" | "nodeParticleSystemSet" | "scene" | "navmesh";

export type VisibleInspectorDecoratorAssetConfiguration<T = VisibleInspectorDecoratorAssetPossibleTypes> = VisibleInInspectorDecoratorConfiguration & {
	assetType: T;
	typeRestriction?: T extends "material" ? "PBRMaterial" | "StandardMaterial" | "AnyMaterial" : never;
};

export function visibleAsAsset(
	assetType: VisibleInspectorDecoratorAssetPossibleTypes,
	label?: string,
	configuration?: Omit<VisibleInspectorDecoratorAssetConfiguration, "type" | "assetType">
) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._VisibleInInspector ??= [];
		ctor._VisibleInInspector.push({
			label,
			propertyKey,
			configuration: {
				...configuration,
				assetType,
				type: "asset",
			} as VisibleInspectorDecoratorAssetConfiguration,
		});
	};
}
