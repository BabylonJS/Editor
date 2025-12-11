import type { VFXValue } from "./values";

/**
 * VFX rotation types (converted from Quarks)
 */
export interface VFXEulerRotation {
    type: "Euler";
    angleX?: VFXValue;
    angleY?: VFXValue;
    angleZ?: VFXValue;
}

export type VFXRotation = VFXEulerRotation | VFXValue;

