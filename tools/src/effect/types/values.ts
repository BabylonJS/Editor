/**
 *  value types (converted from Quarks)
 */
export interface IConstantValue {
	type: "ConstantValue";
	value: number;
}

export interface IIntervalValue {
	type: "IntervalValue";
	min: number;
	max: number;
}

export interface IPiecewiseBezier {
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
export type Value = IConstantValue | IIntervalValue | IPiecewiseBezier | number;
