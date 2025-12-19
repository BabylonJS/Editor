import { Color4 } from "babylonjs";

/**
 * Generic gradient system for storing and interpolating gradient values
 * Similar to Babylon.js native gradients but for SolidParticleSystem
 */
export class GradientSystem<T> {
	private _gradients: Array<{ gradient: number; value: T }>;

	constructor() {
		this._gradients = [];
	}

	/**
	 * Add a gradient point
	 */
	public addGradient(gradient: number, value: T): void {
		// Insert in sorted order
		const index = this._gradients.findIndex((g) => g.gradient > gradient);
		if (index === -1) {
			this._gradients.push({ gradient, value });
		} else {
			this._gradients.splice(index, 0, { gradient, value });
		}
	}

	/**
	 * Get interpolated value at given gradient position (0-1)
	 */
	public getValue(gradient: number): T | null {
		if (this._gradients.length === 0) {
			return null;
		}

		if (this._gradients.length === 1) {
			return this._gradients[0].value;
		}

		// Clamp gradient to [0, 1]
		const clampedGradient = Math.max(0, Math.min(1, gradient));

		// Find the two gradients to interpolate between
		for (let i = 0; i < this._gradients.length - 1; i++) {
			const g1 = this._gradients[i];
			const g2 = this._gradients[i + 1];

			if (clampedGradient >= g1.gradient && clampedGradient <= g2.gradient) {
				const t = g2.gradient - g1.gradient !== 0 ? (clampedGradient - g1.gradient) / (g2.gradient - g1.gradient) : 0;
				return this.interpolate(g1.value, g2.value, t);
			}
		}

		// Clamp to first or last gradient
		if (clampedGradient <= this._gradients[0].gradient) {
			return this._gradients[0].value;
		}
		return this._gradients[this._gradients.length - 1].value;
	}

	/**
	 * Clear all gradients
	 */
	public clear(): void {
		this._gradients = [];
	}

	/**
	 * Get all gradients (for debugging)
	 */
	public getGradients(): Array<{ gradient: number; value: T }> {
		return [...this._gradients];
	}

	/**
	 * Interpolate between two values (to be overridden by subclasses)
	 */
	protected interpolate(value1: T, _value2: T, _t: number): T {
		// Default implementation - should be overridden
		return value1;
	}
}

/**
 * Color gradient system for Color4
 */
export class ColorGradientSystem extends GradientSystem<Color4> {
	protected interpolate(value1: Color4, value2: Color4, t: number): Color4 {
		return new Color4(value1.r + (value2.r - value1.r) * t, value1.g + (value2.g - value1.g) * t, value1.b + (value2.b - value1.b) * t, value1.a + (value2.a - value1.a) * t);
	}
}

/**
 * Number gradient system
 */
export class NumberGradientSystem extends GradientSystem<number> {
	protected interpolate(value1: number, value2: number, t: number): number {
		return value1 + (value2 - value1) * t;
	}
}
