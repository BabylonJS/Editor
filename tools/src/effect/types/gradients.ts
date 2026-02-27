/**
 *  gradient key
 */
export interface IGradientKey {
	time?: number;
	value: number | [number, number, number, number] | { r: number; g: number; b: number; a?: number };
	pos?: number;
}
