import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/**
 * Returns wether or not the given object is a Mesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isMesh(object: any): object is Mesh {
    return object.getClassName?.() === "Mesh";
}

/**
 * Returns wether or not the given object is a Texture.
 * @param object defines the reference to the object to test its class name.
 */
export function isTexture(object: any): object is Texture {
    return object?.getClassName?.() === "Texture";
}
