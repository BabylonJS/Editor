import { Mesh } from "@babylonjs/core/Meshes/mesh";

export function onStart(mesh: Mesh): void {
    // Do something when the script is loaded
}

export function onUpdate(mesh: Mesh): void {
    mesh.rotation.y += 0.04 * mesh.getScene().getAnimationRatio();
}
