/**
 * VFX value types (converted from Quarks)
 */
export interface VFXConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface VFXIntervalValue {
	type: "IntervalValue";
	min: number;
	max: number;
}

export interface VFXPiecewiseBezier {
	type: "PiecewiseBezier";
	functions: Array<{
		function: {
			p0: number;
			p1: number;
			p2: number;
			p3: number;
		};
		start: number;
	}>;
}
export type VFXValue = VFXConstantValue | VFXIntervalValue | VFXPiecewiseBezier | number;
