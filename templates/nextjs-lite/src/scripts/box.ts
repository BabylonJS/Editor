import { Mesh } from "@babylonjs/lite";

import { getNodeScene, getSceneData, IScript, visibleAsNumber } from "babylonjs-editor-tools-lite";

export default class SceneComponent implements IScript {
	@visibleAsNumber("Speed", {
		min: 0,
		max: 0.1,
	})
	private _speed: number = 0.04;

	public constructor(public mesh: Mesh) {}

	public onStart(): void {}

	public onUpdate(): void {
		const scene = getNodeScene(this.mesh);
		if (!scene) {
			return;
		}

		// Rotates the mesh around its local Y axis, as "mesh.rotate(Vector3.UpReadOnly, angle)" does in Babylon.js. The
		// angle is scaled by the animation ratio (elapsed time relative to 60 frames per second).
		const angle = this._speed * getSceneData(scene).deltaMs * (60 / 1000);

		const sin = Math.sin(angle * 0.5);
		const cos = Math.cos(angle * 0.5);

		const { x, y, z, w } = this.mesh.rotationQuaternion;
		this.mesh.rotationQuaternion.set(x * cos - z * sin, y * cos + w * sin, z * cos + x * sin, w * cos - y * sin);
	}
}
