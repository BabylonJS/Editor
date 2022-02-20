import { Nullable } from "../../../../shared/types";

import { UtilityLayerRenderer, Mesh, PickingInfo, MeshBuilder, Vector3, Material } from "babylonjs";

export class Decal {
    /**
     * @hidden
     */
    public _mesh: Nullable<Mesh> = null;
    
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
     * @param layer defines the reference to the layer scene where to draw the decal.
     */
    public constructor(layer: UtilityLayerRenderer) {
        this.layer = layer;
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
            size: new Vector3(this.size.x * this.size.z, this.size.y * this.size.z, this.size.z),
            angle: this.angle,
        });
        mesh.isPickable = false;
        mesh.material = this.material;

        if (this.material?.zOffset === 0) {
            this.material.zOffset = -2;
        }

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
