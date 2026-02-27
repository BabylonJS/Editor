import type { Value } from "./values";

/**
 *  shape configuration
 */
export interface IShape {
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
