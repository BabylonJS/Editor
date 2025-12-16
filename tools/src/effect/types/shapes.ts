import type { Value } from "./values";

/**
 *  shape configuration (converted from Quarks)
 */
export interface Shape {
	type: string;
	radius?: number;
	arc?: number;
	thickness?: number;
	angle?: number;
	mode?: number;
	spread?: number;
	speed?: Value;
	size?: number[];
	height?: number;
}
