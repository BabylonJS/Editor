import { Mesh } from "@babylonjs/core/Meshes/mesh";

export default class SceneComponent {
	public constructor(public mesh: Mesh) { }

	public onStart(): void {

	}

	public onUpdate(): void {
		this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
	}
}
