/**
 * VFX gradient key (converted from Quarks)
 */
export interface VFXGradientKey {
	time?: number;
	value: number | [number, number, number, number] | { r: number; g: number; b: number; a?: number };
	pos?: number;
}
