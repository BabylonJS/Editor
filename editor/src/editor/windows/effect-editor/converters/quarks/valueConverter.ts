import type { IQuarksValue, IQuarksStartSize, IQuarksRotation } from "./types";
import type { Value } from "babylonjs-editor-tools";

/**
 * Convert IQuarks value to Value
 */
export function convertValue(value: IQuarksValue): Value {
	if (typeof value === "number") {
		return value;
	}
	if (value.type === "ConstantValue") {
		return {
			type: "ConstantValue",
			value: value.value,
		};
	}
	if (value.type === "IntervalValue") {
		return {
			type: "IntervalValue",
			min: value.a ?? 0,
			max: value.b ?? 0,
		};
	}
	if (value.type === "PiecewiseBezier") {
		return {
			type: "PiecewiseBezier",
			functions: value.functions.map((f) => ({
				function: f.function,
				start: f.start,
			})),
		};
	}
	// Fallback: return as Value (should not happen with proper types)
	return value as Value;
}

/**
 * Helper: Convert optional IQuarksValue to optional Value
 */
export function convertOptionalValue(value: IQuarksValue | undefined): Value | undefined {
	return value !== undefined ? convertValue(value) : undefined;
}

/**
 * Evaluate bezier curve at time t
 * Bezier format: { p0, p1, p2, p3 } for cubic bezier
 */
export function evaluateBezierAt(bezier: { p0: number; p1: number; p2: number; p3: number }, t: number): number {
	const { p0, p1, p2, p3 } = bezier;
	const t2 = t * t;
	const t3 = t2 * t;
	const mt = 1 - t;
	const mt2 = mt * mt;
	const mt3 = mt2 * mt;
	return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
}

/**
 * Helper: Extract min/max from IQuarksValue
 */
export function extractMinMaxFromValue(value: IQuarksValue | undefined): { min: number; max: number } {
	if (value === undefined) {
		return { min: 0, max: 0 };
	}
	if (typeof value === "number") {
		return { min: value, max: value };
	}
	if (value.type === "ConstantValue") {
		return { min: value.value, max: value.value };
	}
	if (value.type === "IntervalValue") {
		return { min: value.a ?? 0, max: value.b ?? 0 };
	}
	return { min: 0, max: 0 };
}

/**
 * Convert IQuarks value to min/max (handles PiecewiseBezier gradients)
 */
export function convertValueToMinMax(value: IQuarksValue): {
	min: number;
	max: number;
	gradients?: Array<{ gradient: number; factor: number; factor2?: number }>;
} {
	if (typeof value === "number") {
		return { min: value, max: value };
	}
	if (value.type === "ConstantValue") {
		return { min: value.value, max: value.value };
	}
	if (value.type === "IntervalValue") {
		return { min: value.a ?? 0, max: value.b ?? 0 };
	}
	if (value.type === "PiecewiseBezier" && value.functions) {
		// Convert PiecewiseBezier to gradients
		const gradients: Array<{ gradient: number; factor: number; factor2?: number }> = [];
		let minVal = Infinity;
		let maxVal = -Infinity;

		for (const func of value.functions) {
			const startTime = func.start;
			// Evaluate bezier at start and end points
			const startValue = evaluateBezierAt(func.function, 0);
			const endValue = evaluateBezierAt(func.function, 1);

			gradients.push({ gradient: startTime, factor: startValue });

			// Track min/max for fallback
			minVal = Math.min(minVal, startValue, endValue);
			maxVal = Math.max(maxVal, startValue, endValue);
		}

		// Add final point at gradient 1.0 if not present
		if (gradients.length > 0 && gradients[gradients.length - 1].gradient < 1) {
			const lastFunc = value.functions[value.functions.length - 1];
			const endValue = evaluateBezierAt(lastFunc.function, 1);
			gradients.push({ gradient: 1, factor: endValue });
		}

		return {
			min: minVal === Infinity ? 1 : minVal,
			max: maxVal === -Infinity ? 1 : maxVal,
			gradients: gradients.length > 0 ? gradients : undefined,
		};
	}
	return { min: 1, max: 1 };
}

/**
 * Convert IQuarksStartSize to min/max (handles Vector3Function)
 * - ConstantValue → min = max = value
 * - IntervalValue → min = a, max = b
 * - PiecewiseBezier → gradients array
 */
export function convertStartSizeToMinMax(startSize: IQuarksStartSize): {
	min: number;
	max: number;
	gradients?: Array<{ gradient: number; factor: number; factor2?: number }>;
} {
	// Handle Vector3Function type
	if (typeof startSize === "object" && startSize !== null && "type" in startSize && startSize.type === "Vector3Function") {
		// For Vector3Function, use the main value or average of x, y, z
		if (startSize.value !== undefined) {
			return convertValueToMinMax(startSize.value);
		}
		// Fallback: use x value if available
		if (startSize.x !== undefined) {
			return convertValueToMinMax(startSize.x);
		}
		return { min: 1, max: 1 };
	}
	// Otherwise treat as IQuarksValue
	return convertValueToMinMax(startSize as IQuarksValue);
}

/**
 * Convert IQuarks rotation to native min/max radians
 * Supports: number, ConstantValue, IntervalValue, Euler, AxisAngle, RandomQuat
 */
export function convertRotationToMinMax(rotation: IQuarksRotation): { min: number; max: number } {
	if (typeof rotation === "number") {
		return { min: rotation, max: rotation };
	}

	if (typeof rotation === "object" && rotation !== null && "type" in rotation) {
		const rotationType = rotation.type;

		if (rotationType === "ConstantValue") {
			return extractMinMaxFromValue(rotation as IQuarksValue);
		}

		if (rotationType === "IntervalValue") {
			return extractMinMaxFromValue(rotation as IQuarksValue);
		}

		// Handle Euler type - for 2D/billboard particles we use angleZ, fallback to angleX
		if (rotationType === "Euler") {
			const euler = rotation as { type: string; angleZ?: IQuarksValue; angleX?: IQuarksValue };
			if (euler.angleZ !== undefined) {
				return extractMinMaxFromValue(euler.angleZ);
			}
			if (euler.angleX !== undefined) {
				return extractMinMaxFromValue(euler.angleX);
			}
		}
	}

	return { min: 0, max: 0 };
}
