import type { VFXValue } from "./values";

/**
 * VFX rotation types (converted from Quarks)
 */
export interface VFXEulerRotation {
	type: "Euler";
	angleX?: VFXValue;
	angleY?: VFXValue;
	angleZ?: VFXValue;
	order?: "xyz" | "zyx";
}

export interface VFXAxisAngleRotation {
	type: "AxisAngle";
	x?: VFXValue;
	y?: VFXValue;
	z?: VFXValue;
	angle?: VFXValue;
}

export interface VFXRandomQuatRotation {
	type: "RandomQuat";
}

export type VFXRotation = VFXEulerRotation | VFXAxisAngleRotation | VFXRandomQuatRotation | VFXValue;
