import { Quaternion, Vector3 } from "babylonjs";

export function convertPositionToRHS(value: Vector3): Vector3 {
	value.x *= -1;
	return value;
}

export function convertRotationQuaternionToRHS(value: Quaternion): Quaternion {
	if (value.x * value.x + value.y * value.y > 0.5) {
		const absX = Math.abs(value.x);
		const absY = Math.abs(value.y);
		if (absX > absY) {
			const sign = Math.sign(value.x);
			value.x = absX;
			value.y *= -sign;
			value.z *= -sign;
			value.w *= sign;
		} else {
			const sign = Math.sign(value.y);
			value.x *= -sign;
			value.y = absY;
			value.z *= sign;
			value.w *= -sign;
		}
	} else {
		const absZ = Math.abs(value.z);
		const absW = Math.abs(value.w);
		if (absZ > absW) {
			const sign = Math.sign(value.z);
			value.x *= -sign;
			value.y *= sign;
			value.z = absZ;
			value.w *= -sign;
		} else {
			const sign = Math.sign(value.w);
			value.x *= sign;
			value.y *= -sign;
			value.z *= -sign;
			value.w = absW;
		}
	}

	return value;
}
