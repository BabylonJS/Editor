import { ISceneDecoratorData } from "./apply";

export type VisibleInInspectorDecoratorType = "number" | "boolean" | "vector2" | "vector3" | "color3" | "color4";

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
export function visibleAsBoolean(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorNumberConfiguration, "type">,
) {
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

/**
 * Makes the decorated property visible in the editor inspector as a number.
 * The property can be customized per object in the editor and the custom value is applied
 * once the script is invoked at runtime in the game/application.
 * This can be used only by scripts using Classes.
 * @param label defines the optional label displayed in the inspector in the editor.
 * @param configuration defines the optional configuration for the field in the inspector (min, max, etc.).
 */
export function visibleAsNumber(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorNumberConfiguration, "type">,
) {
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
export function visibleAsVector2(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorVector2Configuration, "type">,
) {
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
export function visibleAsVector3(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorVector3Configuration, "type">,
) {
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
export function visibleAsColor3(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorColor3Configuration, "type">,
) {
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
export function visibleAsColor4(
	label?: string,
	configuration?: Omit<VisibleInInspectorDecoratorColor4Configuration, "type">,
) {
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
