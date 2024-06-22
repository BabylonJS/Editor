import { PBRMaterial, StandardMaterial } from "babylonjs";

/**
 * Returns wether or not the given object is a StandardMaterial.
 * @param object defines the reference to the object to test its class name.
 */
export function isStandardMaterial(object: any): object is StandardMaterial {
    return object.getClassName?.() === "StandardMaterial";
}

/**
 * Returns wether or not the given object is a PBRMaterial.
 * @param object defines the reference to the object to test its class name.
 */
export function isPBRMaterial(object: any): object is PBRMaterial {
    return object.getClassName?.() === "PBRMaterial";
}
