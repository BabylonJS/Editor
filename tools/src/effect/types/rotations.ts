import type { Value } from "./values";

/**
 *  rotation types (converted from Quarks)
 */
export interface IEulerRotation {
	type: "Euler";
	angleX?: Value;
	angleY?: Value;
	angleZ?: Value;
	order?: "xyz" | "zyx";
}

export interface IAxisAngleRotation {
	type: "AxisAngle";
	x?: Value;
	y?: Value;
	z?: Value;
	angle?: Value;
}

export interface IRandomQuatRotation {
	type: "RandomQuat";
}

export type Rotation = IEulerRotation | IAxisAngleRotation | IRandomQuatRotation | Value;
