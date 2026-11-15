import { Vec3 } from "@babylonjs/lite";

/**
 * Parses the given axis array and returns its vector.
 * @param axis defines the axis array to parse (ie. [1, 0, 0]).
 */
export function parseAxis(axis: number[]): Vec3 {
	return {
		x: axis[0] ?? 0,
		y: axis[1] ?? 0,
		z: axis[2] ?? 0,
	};
}
