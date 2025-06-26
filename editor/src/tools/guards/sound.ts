import { Sound } from "babylonjs";

/**
 * Returns wether or not the given object is a Sound.
 * @param object defines the reference to the object to test its class name.
 */
export function isSound(object: any): object is Sound {
	return object.getClassName?.() === "Sound";
}
