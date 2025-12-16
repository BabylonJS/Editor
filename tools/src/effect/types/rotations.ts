import type { Value } from "./values";

/**
 *  rotation types (converted from Quarks)
 */
export interface EulerRotation {
	type: "Euler";
	angleX?: Value;
	angleY?: Value;
	angleZ?: Value;
	order?: "xyz" | "zyx";
}

export interface AxisAngleRotation {
	type: "AxisAngle";
	x?: Value;
	y?: Value;
	z?: Value;
	angle?: Value;
}

export interface RandomQuatRotation {
	type: "RandomQuat";
}

export type Rotation = EulerRotation | AxisAngleRotation | RandomQuatRotation | Value;
