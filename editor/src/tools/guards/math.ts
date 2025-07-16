import { Quaternion, Vector3 } from "babylonjs";

/**
 * Returns wether or not the given object is a Vector3.
 * @param object defines the reference to the object to test its class name.
 */
export function isVector3(object: any): object is Vector3 {
	return object.getClassName?.() === "Vector3";
}

/**
 * Returns wether or not the given object is a Quaternion.
 * @param object defines the reference to the object to test its class name.
 */
export function isQuaternion(object: any): object is Quaternion {
	return object.getClassName?.() === "Quaternion";
}
