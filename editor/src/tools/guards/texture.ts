import { CubeTexture, Texture } from "babylonjs";

/**
 * Returns wether or not the given object is a Texture.
 * @param object defines the reference to the object to test its class name.
 */
export function isTexture(object: any): object is Texture {
    return object?.getClassName?.() === "Texture";
}

/**
 * Returns wether or not the given object is a CubeTexture.
 * @param object defines the reference to the object to test its class name.
 */
export function isCubeTexture(object: any): object is CubeTexture {
    return object?.getClassName?.() === "CubeTexture";
}
