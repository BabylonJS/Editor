import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GroundMesh } from "@babylonjs/core/Meshes/groundMesh";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/**
 * Returns wether or not the given object is a Mesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isMesh(object: any): object is Mesh {
    switch (object.getClassName?.()) {
        case "Mesh":
        case "GroundMesh":
            return true;
    }

    return false;
}

/**
 * Returns wether or not the given object is a GroundMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isGroundMesh(object: any): object is GroundMesh {
    return object.getClassName?.() === "GroundMesh";
}

/**
 * Returns wether or not the given object is a Texture.
 * @param object defines the reference to the object to test its class name.
 */
export function isTexture(object: any): object is Texture {
    return object?.getClassName?.() === "Texture";
}
