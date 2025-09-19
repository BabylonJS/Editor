import { Quaternion, Vector2, Vector3, Color3, Color4 } from "babylonjs";

/**
 * Returns wether or not the given object is a Vector2.
 * @param object defines the reference to the object to test its class name.
 */
export function isVector2(object: any): object is Vector2 {
	return object.getClassName?.() === "Vector2";
}

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

/**
 * Returns wether or not the given object is a Color3.
 * @param object defines the reference to the object to test its class name.
 */
export function isColor3(object: any): object is Color3 {
	return object.getClassName?.() === "Color3";
}

/**
 * Returns wether or not the given object is a Color4.
 * @param object defines the reference to the object to test its class name.
 */
export function isColor4(object: any): object is Color4 {
	return object.getClassName?.() === "Color4";
}
