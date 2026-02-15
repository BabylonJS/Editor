import type {
	IQuarksBehavior,
	IQuarksColorOverLifeBehavior,
	IQuarksSizeOverLifeBehavior,
	IQuarksRotationOverLifeBehavior,
	IQuarksForceOverLifeBehavior,
	IQuarksGravityForceBehavior,
	IQuarksSpeedOverLifeBehavior,
	IQuarksFrameOverLifeBehavior,
	IQuarksLimitSpeedOverLifeBehavior,
	IQuarksColorBySpeedBehavior,
	IQuarksSizeBySpeedBehavior,
	IQuarksRotationBySpeedBehavior,
	IQuarksOrbitOverLifeBehavior,
	IQuarksGradientColor,
	IQuarksConstantColorColor,
	IQuarksRandomColorBetweenGradient,
	IQuarksGradientKey,
} from "./types";
import type { Behavior, IColorFunction, IForceOverLifeBehavior, ISpeedOverLifeBehavior, ILimitSpeedOverLifeBehavior, ISizeBySpeedBehavior } from "babylonjs-editor-tools";
import { convertOptionalValue } from "./valueConverter";
import { convertGradientKeys, convertSpeedOrFrameValue } from "./resourceConverter";
import { extractConstantColor } from "./colorConverter";

/**
 * Convert IQuarks behavior to behavior
 */
export function convertBehavior(behavior: IQuarksBehavior): Behavior {
	switch (behavior.type) {
		case "ColorOverLife":
			return convertColorOverLifeBehavior(behavior as IQuarksColorOverLifeBehavior);
		case "SizeOverLife":
			return convertSizeOverLifeBehavior(behavior as IQuarksSizeOverLifeBehavior);
		case "RotationOverLife":
		case "Rotation3DOverLife":
			return convertRotationOverLifeBehavior(behavior as IQuarksRotationOverLifeBehavior);
		case "ForceOverLife":
		case "ApplyForce":
			return convertForceOverLifeBehavior(behavior as IQuarksForceOverLifeBehavior);
		case "GravityForce":
			return convertGravityForceBehavior(behavior as IQuarksGravityForceBehavior);
		case "SpeedOverLife":
			return convertSpeedOverLifeBehavior(behavior as IQuarksSpeedOverLifeBehavior);
		case "FrameOverLife":
			return convertFrameOverLifeBehavior(behavior as IQuarksFrameOverLifeBehavior);
		case "LimitSpeedOverLife":
			return convertLimitSpeedOverLifeBehavior(behavior as IQuarksLimitSpeedOverLifeBehavior);
		case "ColorBySpeed":
			return convertColorBySpeedBehavior(behavior as IQuarksColorBySpeedBehavior);
		case "SizeBySpeed":
			return convertSizeBySpeedBehavior(behavior as IQuarksSizeBySpeedBehavior);
		case "RotationBySpeed":
			return convertRotationBySpeedBehavior(behavior as IQuarksRotationBySpeedBehavior);
		case "OrbitOverLife":
			return convertOrbitOverLifeBehavior(behavior as IQuarksOrbitOverLifeBehavior);
		default:
			// Fallback for unknown behaviors - copy as-is
			return behavior as Behavior;
	}
}

/**
 * Convert ColorOverLife behavior
 */
function convertColorOverLifeBehavior(behavior: IQuarksColorOverLifeBehavior): Behavior {
	if (!behavior.color) {
		return {
			type: "ColorOverLife",
			color: {
				colorFunctionType: "ConstantColor",
				data: {},
			},
		};
	}

	const colorType = behavior.color.type;
	let colorFunction: IColorFunction;

	if (colorType === "Gradient") {
		const gradientColor = behavior.color as IQuarksGradientColor;
		colorFunction = {
			colorFunctionType: "Gradient",
			data: {
				colorKeys: convertGradientKeys(gradientColor.color?.keys),
				alphaKeys: convertGradientKeys(gradientColor.alpha?.keys),
			},
		};
	} else if (colorType === "ConstantColor") {
		const constantColor = behavior.color as IQuarksConstantColorColor;
		const color = extractConstantColor(constantColor);
		colorFunction = {
			colorFunctionType: "ConstantColor",
			data: {
				color: {
					r: color.r ?? 1,
					g: color.g ?? 1,
					b: color.b ?? 1,
					a: color.a !== undefined ? color.a : 1,
				},
			},
		};
	} else if (colorType === "RandomColorBetweenGradient") {
		const randomColor = behavior.color as IQuarksRandomColorBetweenGradient;
		colorFunction = {
			colorFunctionType: "RandomColorBetweenGradient",
			data: {
				gradient1: {
					colorKeys: convertGradientKeys(randomColor.gradient1?.color?.keys),
					alphaKeys: convertGradientKeys(randomColor.gradient1?.alpha?.keys),
				},
				gradient2: {
					colorKeys: convertGradientKeys(randomColor.gradient2?.color?.keys),
					alphaKeys: convertGradientKeys(randomColor.gradient2?.alpha?.keys),
				},
			},
		};
	} else {
		// Fallback: try to detect format from keys
		const colorData = behavior.color as {
			color?: { keys?: IQuarksGradientKey[] };
			alpha?: { keys?: IQuarksGradientKey[] };
			keys?: IQuarksGradientKey[];
		};
		const hasColorKeys = colorData.color?.keys && colorData.color.keys.length > 0;
		const hasAlphaKeys = colorData.alpha?.keys && colorData.alpha.keys.length > 0;
		const hasKeys = colorData.keys && colorData.keys.length > 0;

		if (hasColorKeys || hasAlphaKeys || hasKeys) {
			const colorKeys = hasColorKeys ? convertGradientKeys(colorData.color?.keys) : hasKeys ? convertGradientKeys(colorData.keys) : [];
			const alphaKeys = hasAlphaKeys ? convertGradientKeys(colorData.alpha?.keys) : [];
			colorFunction = {
				colorFunctionType: "Gradient",
				data: {
					colorKeys,
					alphaKeys,
				},
			};
		} else {
			// Default to ConstantColor
			colorFunction = {
				colorFunctionType: "ConstantColor",
				data: {},
			};
		}
	}

	return {
		type: "ColorOverLife",
		color: colorFunction,
	};
}

/**
 * Convert SizeOverLife behavior
 */
function convertSizeOverLifeBehavior(behavior: IQuarksSizeOverLifeBehavior): Behavior {
	if (!behavior.size) {
		return { type: "SizeOverLife" };
	}
	return {
		type: "SizeOverLife",
		size: {
			...(behavior.size.keys && { keys: convertGradientKeys(behavior.size.keys) }),
			...(behavior.size.functions && { functions: behavior.size.functions }),
		},
	};
}

/**
 * Convert RotationOverLife behavior
 */
function convertRotationOverLifeBehavior(behavior: IQuarksRotationOverLifeBehavior): Behavior {
	return {
		type: behavior.type,
		angularVelocity: convertOptionalValue(behavior.angularVelocity),
	};
}

/**
 * Convert ForceOverLife behavior
 */
function convertForceOverLifeBehavior(behavior: IQuarksForceOverLifeBehavior): Behavior {
	const result: IForceOverLifeBehavior = { type: behavior.type };
	if (behavior.force) {
		result.force = {
			x: convertOptionalValue(behavior.force.x),
			y: convertOptionalValue(behavior.force.y),
			z: convertOptionalValue(behavior.force.z),
		};
	}
	result.x = convertOptionalValue(behavior.x);
	result.y = convertOptionalValue(behavior.y);
	result.z = convertOptionalValue(behavior.z);
	return result;
}

/**
 * Convert GravityForce behavior
 */
function convertGravityForceBehavior(behavior: IQuarksGravityForceBehavior): Behavior {
	return {
		type: "GravityForce",
		gravity: convertOptionalValue(behavior.gravity),
	} as Behavior;
}

/**
 * Convert SpeedOverLife behavior
 */
function convertSpeedOverLifeBehavior(behavior: IQuarksSpeedOverLifeBehavior): Behavior {
	const speed = convertSpeedOrFrameValue(behavior.speed);
	return { type: "SpeedOverLife", ...(speed !== undefined && { speed }) } as ISpeedOverLifeBehavior;
}

/**
 * Convert FrameOverLife behavior
 */
function convertFrameOverLifeBehavior(behavior: IQuarksFrameOverLifeBehavior): Behavior {
	const frame = convertSpeedOrFrameValue(behavior.frame);
	return { type: "FrameOverLife", ...(frame !== undefined && { frame }) } as Behavior;
}

/**
 * Convert LimitSpeedOverLife behavior
 */
function convertLimitSpeedOverLifeBehavior(behavior: IQuarksLimitSpeedOverLifeBehavior): Behavior {
	const speed = convertSpeedOrFrameValue(behavior.speed);
	return {
		type: "LimitSpeedOverLife",
		maxSpeed: convertOptionalValue(behavior.maxSpeed),
		...(speed !== undefined && { speed }),
		dampen: convertOptionalValue(behavior.dampen),
	} as ILimitSpeedOverLifeBehavior;
}

/**
 * Convert ColorBySpeed behavior
 */
function convertColorBySpeedBehavior(behavior: IQuarksColorBySpeedBehavior): Behavior {
	const colorFunction: IColorFunction = behavior.color?.keys
		? {
				colorFunctionType: "Gradient",
				data: {
					colorKeys: convertGradientKeys(behavior.color.keys),
					alphaKeys: [],
				},
			}
		: {
				colorFunctionType: "ConstantColor",
				data: {},
			};

	return {
		type: "ColorBySpeed",
		color: colorFunction,
		minSpeed: convertOptionalValue(behavior.minSpeed),
		maxSpeed: convertOptionalValue(behavior.maxSpeed),
	};
}

/**
 * Convert SizeBySpeed behavior
 */
function convertSizeBySpeedBehavior(behavior: IQuarksSizeBySpeedBehavior): Behavior {
	return {
		type: "SizeBySpeed",
		minSpeed: convertOptionalValue(behavior.minSpeed),
		maxSpeed: convertOptionalValue(behavior.maxSpeed),
		...(behavior.size?.keys && { size: { keys: convertGradientKeys(behavior.size.keys) } }),
	} as ISizeBySpeedBehavior;
}

/**
 * Convert RotationBySpeed behavior
 */
function convertRotationBySpeedBehavior(behavior: IQuarksRotationBySpeedBehavior): Behavior {
	return {
		type: "RotationBySpeed",
		angularVelocity: convertOptionalValue(behavior.angularVelocity),
		minSpeed: convertOptionalValue(behavior.minSpeed),
		maxSpeed: convertOptionalValue(behavior.maxSpeed),
	} as Behavior;
}

/**
 * Convert OrbitOverLife behavior
 */
function convertOrbitOverLifeBehavior(behavior: IQuarksOrbitOverLifeBehavior): Behavior {
	return {
		type: "OrbitOverLife",
		center: behavior.center,
		radius: convertOptionalValue(behavior.radius),
		speed: convertOptionalValue(behavior.speed),
	} as Behavior;
}
