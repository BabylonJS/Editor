import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function parseAxis(axis: number[]): Vector3 {
	const vector = Vector3.FromArray(axis);
	if (vector.equals(Axis.X)) {
		return Axis.X;
	}

	if (vector.equals(Axis.Y)) {
		return Axis.Y;
	}

	if (vector.equals(Axis.Z)) {
		return Axis.Z;
	}

	return vector;
}
