import { Matrix, Quaternion, Vector3 } from "babylonjs";

/**
 * Reflection matrix used to convert between the right-handed coordinate system used by Assimp (and FBX, Collada, etc.)
 * and the left-handed coordinate system used by Babylon.js. Mirroring the Z axis is its own inverse, so the same
 * matrix is used on both sides of the conjugation `F * M * F`.
 */
const FlipZ = Matrix.Scaling(1, 1, -1);

/**
 * Identity transformation used as a fallback when a node has no transformation array.
 */
const Identity16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Converts an Assimp transformation matrix (flat array of 16 numbers) to a Babylon.js matrix.
 *
 * Two conversions are applied:
 * - Assimp matrices are **row-major** whereas Babylon.js stores matrices **column-major**, so the raw array is transposed.
 * - Assimp data is **right-handed** whereas Babylon.js is **left-handed**, so the matrix is mirrored along Z (`F * M * F`).
 *
 * @param transformation defines the flat 16-number transformation array as exported by Assimp.
 */
export function assimpMatrixToBabylon(transformation?: number[]): Matrix {
	const rightHanded = Matrix.FromArray(transformation ?? Identity16).transpose();
	return FlipZ.multiply(rightHanded).multiply(FlipZ);
}

/**
 * Converts an Assimp position keyframe value `[x, y, z]` (right-handed) to a left-handed Babylon.js vector.
 * @param value defines the position array as exported by Assimp.
 */
export function convertPositionKey(value: number[]): Vector3 {
	return new Vector3(value[0], value[1], -value[2]);
}

/**
 * Converts an Assimp scaling keyframe value `[x, y, z]` to a Babylon.js vector. Scaling is invariant to the Z mirror.
 * @param value defines the scaling array as exported by Assimp.
 */
export function convertScalingKey(value: number[]): Vector3 {
	return new Vector3(value[0], value[1], value[2]);
}

/**
 * Converts an Assimp rotation keyframe value to a left-handed Babylon.js quaternion.
 * Assimp exports quaternions in `[w, x, y, z]` order in a right-handed system. Mirroring the rotation along Z turns
 * the quaternion `(w, x, y, z)` into `(w, -x, -y, z)`, which is `(-x, -y, z, w)` in Babylon's `(x, y, z, w)` order.
 * @param value defines the rotation array as exported by Assimp (`[w, x, y, z]`).
 */
export function convertRotationKey(value: number[]): Quaternion {
	if (value.length < 4) {
		// Fallback for the rare case where rotation is exported as Euler angles.
		return Vector3.FromArray(value).toQuaternion();
	}

	const [w, x, y, z] = value;
	return new Quaternion(-x, -y, z, w);
}
