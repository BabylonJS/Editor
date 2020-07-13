import { Nullable } from "../../../../shared/types";

import { Mesh, Scene, UtilityLayerRenderer, Material, StandardMaterial, PickingInfo } from "babylonjs";

export class Volume {
    private _mesh: Nullable<Mesh> = null;

    /**
     * Defines the layer used to render the volume.
     */
    public layer: UtilityLayerRenderer;
    /**
     * Defines the radius of the volume.
     */
    public radius: number = 1;
    /**
     * Defines the material of the volume.
     */
    public material: Material;

    /**
     * Constructor.
     * @param scene defines the scene where to draw the volume.
     */
    public constructor(scene: Scene) {
        this.layer = new UtilityLayerRenderer(scene);
        this.layer.utilityLayerScene.postProcessesEnabled = false;

        this.material = new StandardMaterial("volume-material", this.layer.utilityLayerScene);
        this.material.alpha = 0.4;
    }

    /**
     * Disposes the volume.
     */
    public dispose(): void {
        this.disposeMesh();
        this.layer.dispose();
    }

    /**
     * Creates the mesh.
     */
    public createMesh(): void {
        if (this._mesh) { return; }

        this._mesh = Mesh.CreateSphere("volume", 32, this.radius * 2, this.layer.utilityLayerScene);
        this._mesh.material = this.material;

        this.layer.originalScene.removeMesh(this._mesh);
        this.layer.utilityLayerScene.addMesh(this._mesh);
    }

    /**
     * Disposes the current volume mesh.
     */
    public disposeMesh(): void {
        if (this._mesh) {
            this.layer.utilityLayerScene.removeMesh(this._mesh);

            this._mesh.geometry?.dispose();
            
            this._mesh.dispose(true, false);
            this._mesh = null;
        }
    }

    /**
     * Updates the volume mesh according to the given picking infos.
     * @param pickInfo defines the picking infos.
     */
    public updateMesh(pickInfo: PickingInfo): void {
        if (!this._mesh) { return; }

        if (pickInfo.pickedPoint) {
            this._mesh.position.copyFrom(pickInfo.pickedPoint);
        }
    }
}
