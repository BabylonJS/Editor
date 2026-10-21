import { Mat4, SceneNode, Vec3 } from "@babylonjs/lite";

/**
 * Converts the given Euler angles to a quaternion using the same convention as Babylon.js (yaw = Y, pitch = X,
 * roll = Z, applied in the Y-X-Z order). The Euler proxy of Babylon Lite nodes (`node.rotation`) uses the X-Y-Z
 * order instead: the rotations saved by the editor must be converted using this function.
 * @param x defines the rotation around the X axis (pitch) in radians.
 * @param y defines the rotation around the Y axis (yaw) in radians.
 * @param z defines the rotation around the Z axis (roll) in radians.
 * @returns the quaternion as [x, y, z, w].
 */
export function babylonEulerToQuaternion(x: number, y: number, z: number): [number, number, number, number] {
	const halfRoll = z * 0.5;
	const halfPitch = x * 0.5;
	const halfYaw = y * 0.5;

	const sinRoll = Math.sin(halfRoll);
	const cosRoll = Math.cos(halfRoll);
	const sinPitch = Math.sin(halfPitch);
	const cosPitch = Math.cos(halfPitch);
	const sinYaw = Math.sin(halfYaw);
	const cosYaw = Math.cos(halfYaw);

	return [
		cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll,
		sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll,
		cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll,
		cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll,
	];
}

/**
 * Converts the given quaternion to Euler angles using the same convention as Babylon.js (`Quaternion.toEulerAngles`).
 * @param x defines the X component of the quaternion.
 * @param y defines the Y component of the quaternion.
 * @param z defines the Z component of the quaternion.
 * @param w defines the W component of the quaternion.
 * @returns the Euler angles as [x, y, z] in radians.
 */
export function quaternionToBabylonEuler(x: number, y: number, z: number, w: number): [number, number, number] {
	const zAxisY = y * z - x * w;
	const limit = 0.4999999;

	if (zAxisY < -limit) {
		return [Math.PI / 2, 2 * Math.atan2(y, w), 0];
	}

	if (zAxisY > limit) {
		return [-Math.PI / 2, 2 * Math.atan2(y, w), 0];
	}

	const sqw = w * w;
	const sqz = z * z;
	const sqx = x * x;
	const sqy = y * y;

	return [Math.asin(-2.0 * zAxisY), Math.atan2(2.0 * (z * x + y * w), sqz - sqx - sqy + sqw), Math.atan2(2.0 * (x * y + z * w), -sqz - sqx + sqy + sqw)];
}

/**
 * Sets the rotation of the given node from Euler angles expressed with the Babylon.js convention.
 * @param node defines the reference to the node to rotate.
 * @param x defines the rotation around the X axis (pitch) in radians.
 * @param y defines the rotation around the Y axis (yaw) in radians.
 * @param z defines the rotation around the Z axis (roll) in radians.
 */
export function setNodeBabylonRotation(node: SceneNode, x: number, y: number, z: number): void {
	const q = babylonEulerToQuaternion(x, y, z);
	node.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
}

/**
 * Returns the translation part of the given matrix.
 * @param matrix defines the matrix to get the translation from.
 */
export function getMatrixTranslation(matrix: Mat4): Vec3 {
	return { x: matrix[12], y: matrix[13], z: matrix[14] };
}

/**
 * Transforms the given direction (normal) by the rotation and scaling part of the given matrix.
 * @param matrix defines the matrix to apply.
 * @param x defines the X component of the direction.
 * @param y defines the Y component of the direction.
 * @param z defines the Z component of the direction.
 */
export function transformDirection(matrix: Mat4, x: number, y: number, z: number): Vec3 {
	return {
		x: x * matrix[0] + y * matrix[4] + z * matrix[8],
		y: x * matrix[1] + y * matrix[5] + z * matrix[9],
		z: x * matrix[2] + y * matrix[6] + z * matrix[10],
	};
}

/**
 * Returns the distance between the two given points.
 */
export function distanceVec3(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;

	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Returns the world position of the given node (or camera).
 * @param node defines the reference to the node.
 */
export function getAbsolutePosition(node: { readonly worldMatrix: Mat4 }): Vec3 {
	return getMatrixTranslation(node.worldMatrix);
}
