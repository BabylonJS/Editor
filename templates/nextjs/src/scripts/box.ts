import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { IScript, visibleAsNumber } from "babylonjs-editor-tools";

export default class SceneComponent implements IScript {
    @visibleAsNumber("Speed", {
    	min: 0,
    	max: 0.1,
    })
	private _speed: number = 0.04;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {

    }

    public onUpdate(): void {
    	this.mesh.rotation.y += this._speed * this.mesh.getScene().getAnimationRatio();
    }
}
