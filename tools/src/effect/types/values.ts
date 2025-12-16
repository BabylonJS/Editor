/**
 *  value types (converted from Quarks)
 */
export interface ConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IntervalValue {
	type: "IntervalValue";
	min: number;
	max: number;
}

export interface PiecewiseBezier {
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
export type Value = ConstantValue | IntervalValue | PiecewiseBezier | number;
