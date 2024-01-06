import { CascadedShadowGenerator } from "babylonjs";

/**
 * Returns wether or not the given object is a CascadedShadowGenerator.
 * @param object defines the reference to the object to test its class name.
 */
export function isCascadedShadowGenerator(object: any): object is CascadedShadowGenerator {
    return object.getClassName?.() === "CascadedShadowGenerator";
}
