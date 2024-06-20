import { Scene } from "babylonjs";

/**
 * Returns wether or not the given object is a Scene.
 * @param object defines the reference to the object to test its class name.
 */
export function isScene(object: any): object is Scene {
    return object.getClassName?.() === "Scene";
}
