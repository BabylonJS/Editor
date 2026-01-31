export const tsClassBasedExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export default class MyScriptComponent {
    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        // Do something when the script is loaded
    }

    public onUpdate(): void {
        // Executed each frame
        this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
    }
}
`;

export const tsFunctionBasedExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export function onStart(mesh: Mesh): void {
    // Do something when the script is loaded
}

export function onUpdate(mesh: Mesh): void {
    // Executed each frame
    mesh.rotation.y += 0.04 * mesh.getScene().getAnimationRatio();
}
`;
