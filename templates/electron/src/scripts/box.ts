import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { IScript, visibleAsNumber } from "babylonjs-editor-tools";

export default class SceneComponent implements IScript {
	@visibleAsNumber("Speed", {
		min: 0,
		max: 0.1,
	})
	private _speed: number = 0.04;

	public constructor(public mesh: Mesh) {}

	public onStart(): void {}

	public onUpdate(): void {
		this.mesh.rotate(Vector3.UpReadOnly, this._speed * this.mesh.getScene().getAnimationRatio());
	}
}
