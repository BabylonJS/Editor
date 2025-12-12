import type { VFXValue } from "./values";

/**
 * VFX shape configuration (converted from Quarks)
 */
export interface VFXShape {
	type: string;
	radius?: number;
	arc?: number;
	thickness?: number;
	angle?: number;
	mode?: number;
	spread?: number;
	speed?: VFXValue;
	size?: number[];
	height?: number;
}
