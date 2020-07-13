import { Nullable } from "../../../../shared/types";

import { UtilityLayerRenderer, Scene, Mesh, PickingInfo, MeshBuilder, Vector3, Material } from "babylonjs";

export class Decal {
    private _mesh: Nullable<Mesh> = null;
    
    /**
     * Defines the layer used to render the decal.
     */
    public layer: UtilityLayerRenderer;
    /**
     * Defines the size of the decal to draw.
     */
    public size: Vector3 = new Vector3(1, 1, 1);
    /**
     * Defines the angle of the decal.
     */
    public angle: number = 0;
    /**
     * Defines the material used by the decal.
     */
    public material: Nullable<Material> = null;

    /**
     * Constructor.
     * @param scene defines the scene where to draw the decal.
     */
    public constructor(scene: Scene) {
        this.layer = new UtilityLayerRenderer(scene);
        this.layer.utilityLayerScene.postProcessesEnabled = false;
    }

    /**
     * Disposes the decal.
     */
    public dispose(): void {
        this.disposeMesh();
        this.layer.dispose();
    }

    /**
     * Updates the decal. Typically when the mouse moved.
     * @param pickInfo defines the picking infos.
     */
    public updateDecal(pickInfo: PickingInfo): void {
        this.disposeMesh();

        this._mesh = this.createDecal(pickInfo);
        if (!this._mesh) { return; }

        this.layer.originalScene.removeMesh(this._mesh);
        this.layer.utilityLayerScene.addMesh(this._mesh);
    }

    /**
     * Creates the decal according to the given picking infos.
     * @param pickInfo defines the picking infos.
     */
    public createDecal(pickInfo: PickingInfo): Nullable<Mesh> {
        if (!pickInfo.hit || !pickInfo.pickedMesh || !pickInfo.pickedPoint) { return null; }

        const mesh = MeshBuilder.CreateDecal("decal", pickInfo.pickedMesh, {
            position: pickInfo.pickedPoint,
            normal: pickInfo.getNormal(true) ?? undefined,
            size: this.size,
            angle: this.angle,
        });
        mesh.material = this.material;

        return mesh;
    }

    /**
     * Disposes the current decal mesh.
     */
    public disposeMesh(): void {
        if (this._mesh) {
            this.layer.utilityLayerScene.removeMesh(this._mesh);

            this._mesh.geometry?.dispose();
            
            this._mesh.dispose(true, false);
            this._mesh = null;
        }
    }
}
