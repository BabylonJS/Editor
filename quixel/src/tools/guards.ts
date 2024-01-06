import { Mesh } from "babylonjs";

/**
 * Returns wether or not the given object is a Mesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isMesh(object: any): object is Mesh {
    return object.getClassName?.() === "Mesh";
}
