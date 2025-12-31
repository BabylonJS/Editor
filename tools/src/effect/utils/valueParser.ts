import { Color4, ColorGradient } from "babylonjs";
import type { IPiecewiseBezier, Value } from "../types/values";
import type { Color } from "../types/colors";
import type { IGradientKey } from "../types/gradients";

/**
 * Static utility functions for parsing  values
 * These are stateless and don't require an instance
 */
export class ValueUtils {
	/**
	 * Parse a constant value
	 */
	public static parseConstantValue(value: Value): number {
		if (value && typeof value === "object" && value.type === "ConstantValue") {
			return value.value || 0;
		}
		return typeof value === "number" ? value : 0;
	}

	/**
	 * Parse an interval value (returns min and max)
	 */
	public static parseIntervalValue(value: Value): { min: number; max: number } {
		if (value && typeof value === "object" && "type" in value && value.type === "IntervalValue") {
			return {
				min: value.min ?? 0,
				max: value.max ?? 0,
			};
		}
		const constant = this.parseConstantValue(value);
		return { min: constant, max: constant };
	}

	/**
	 * Parse a constant color
	 * Supports formats:
	 * - { type: "ConstantColor", value: [r, g, b, a] }
	 * - { type: "ConstantColor", color: { r, g, b, a } }
	 * - [r, g, b, a] (array)
	 */
	public static parseConstantColor(value: Color): Color4 {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			if ("type" in value && value.type === "ConstantColor") {
				// Format: { type: "ConstantColor", value: [r, g, b, a] }
				if (value.value && Array.isArray(value.value)) {
					return new Color4(value.value[0] || 0, value.value[1] || 0, value.value[2] || 0, value.value[3] !== undefined ? value.value[3] : 1);
				}
				// Format: { type: "ConstantColor", color: { r, g, b, a } }
				const anyValue = value as any;
				if (anyValue.color && typeof anyValue.color === "object") {
					return new Color4(
						anyValue.color.r ?? 1,
						anyValue.color.g ?? 1,
						anyValue.color.b ?? 1,
						anyValue.color.a !== undefined ? anyValue.color.a : 1
					);
				}
			}
		}
		// Array format [r, g, b, a?]
		if (Array.isArray(value) && value.length >= 3) {
			return new Color4(value[0] || 0, value[1] || 0, value[2] || 0, value[3] !== undefined ? value[3] : 1);
		}
		return new Color4(1, 1, 1, 1);
	}

	/**
	 * Parse a value for particle spawn (returns a single value based on type)
	 * Handles ConstantValue, IntervalValue, PiecewiseBezier, and number
	 * @param value The value to parse
	 * @param normalizedTime Normalized time (0-1) for PiecewiseBezier, default is random for IntervalValue
	 */
	public static parseValue(value: Value, normalizedTime?: number): number {
		if (!value || typeof value === "number") {
			return typeof value === "number" ? value : 0;
		}

		if (value.type === "ConstantValue") {
			return value.value || 0;
		}

		if (value.type === "IntervalValue") {
			const min = value.min ?? 0;
			const max = value.max ?? 0;
			return min + Math.random() * (max - min);
		}

		if (value.type === "PiecewiseBezier") {
			// Use provided normalizedTime or random for spawn
			const t = normalizedTime !== undefined ? normalizedTime : Math.random();
			return this._evaluatePiecewiseBezier(value, t);
		}

		// Fallback
		return 0;
	}

	/**
	 * Evaluate PiecewiseBezier at normalized time t (0-1)
	 */
	private static _evaluatePiecewiseBezier(bezier: IPiecewiseBezier, t: number): number {
		if (!bezier.functions || bezier.functions.length === 0) {
			return 0;
		}

		// Clamp t to [0, 1]
		const clampedT = Math.max(0, Math.min(1, t));

		// Find which function segment contains t
		let segmentIndex = -1;
		for (let i = 0; i < bezier.functions.length; i++) {
			const func = bezier.functions[i];
			const start = func.start;
			const end = i < bezier.functions.length - 1 ? bezier.functions[i + 1].start : 1;

			if (clampedT >= start && clampedT < end) {
				segmentIndex = i;
				break;
			}
		}

		// If t is at the end (1.0), use last segment
		if (segmentIndex === -1 && clampedT >= 1) {
			segmentIndex = bezier.functions.length - 1;
		}

		// If still not found, use first segment
		if (segmentIndex === -1) {
			segmentIndex = 0;
		}

		const func = bezier.functions[segmentIndex];
		const start = func.start;
		const end = segmentIndex < bezier.functions.length - 1 ? bezier.functions[segmentIndex + 1].start : 1;

		// Normalize t within this segment
		const segmentT = end > start ? (clampedT - start) / (end - start) : 0;

		// Evaluate cubic Bezier: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
		const p0 = func.function.p0;
		const p1 = func.function.p1;
		const p2 = func.function.p2;
		const p3 = func.function.p3;

		const t2 = segmentT * segmentT;
		const t3 = t2 * segmentT;
		const mt = 1 - segmentT;
		const mt2 = mt * mt;
		const mt3 = mt2 * mt;

		return mt3 * p0 + 3 * mt2 * segmentT * p1 + 3 * mt * t2 * p2 + t3 * p3;
	}

	/**
	 * Parse gradient color keys
	 */
	public static parseGradientColorKeys(keys: IGradientKey[]): ColorGradient[] {
		const gradients: ColorGradient[] = [];
		for (const key of keys) {
			const pos = key.pos ?? key.time ?? 0;
			if (key.value !== undefined && pos !== undefined) {
				let color4: Color4;
				if (typeof key.value === "number") {
					// Single number - grayscale
					color4 = new Color4(key.value, key.value, key.value, 1);
				} else if (Array.isArray(key.value)) {
					// Array format [r, g, b, a?]
					color4 = new Color4(key.value[0] || 0, key.value[1] || 0, key.value[2] || 0, key.value[3] !== undefined ? key.value[3] : 1);
				} else {
					// Object format { r, g, b, a? }
					color4 = new Color4(key.value.r || 0, key.value.g || 0, key.value.b || 0, key.value.a !== undefined ? key.value.a : 1);
				}
				gradients.push(new ColorGradient(pos, color4));
			}
		}
		return gradients;
	}

	/**
	 * Parse gradient alpha keys
	 */
	public static parseGradientAlphaKeys(keys: IGradientKey[]): { gradient: number; factor: number }[] {
		const gradients: { gradient: number; factor: number }[] = [];
		for (const key of keys) {
			const pos = key.pos ?? key.time ?? 0;
			if (key.value !== undefined && pos !== undefined) {
				let factor: number;
				if (typeof key.value === "number") {
					factor = key.value;
				} else if (Array.isArray(key.value)) {
					factor = key.value[3] !== undefined ? key.value[3] : 1;
				} else {
					factor = key.value.a !== undefined ? key.value.a : 1;
				}
				gradients.push({ gradient: pos, factor });
			}
		}
		return gradients;
	}
}
