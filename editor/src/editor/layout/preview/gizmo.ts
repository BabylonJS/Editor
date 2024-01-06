import { GizmoCoordinatesMode, Node, PositionGizmo, RotationGizmo, ScaleGizmo, Scene, UtilityLayerRenderer } from "babylonjs";

export class EditorPreviewGizmo {
    /**
     * @internal
     */
    public _gizmosLayer: UtilityLayerRenderer;

    private _scalingGizmo: ScaleGizmo | null = null;
    private _positionGizmo: PositionGizmo | null = null;
    private _rotationGizmo: RotationGizmo | null = null;

    private _coordinatesMode: GizmoCoordinatesMode = GizmoCoordinatesMode.Local;

    private _attachedNode: Node | null = null;

    public constructor(scene: Scene) {
        this._gizmosLayer = new UtilityLayerRenderer(scene);
        this._gizmosLayer.utilityLayerScene.postProcessesEnabled = false;
    }

    /**
     * Gets the current gizmo.
     */
    public get currentGizmo(): PositionGizmo | RotationGizmo | ScaleGizmo | null {
        return this._positionGizmo ?? this._rotationGizmo ?? this._scalingGizmo ?? null;
    }

    /**
     * Sets the gizmo type.
     * @param gizmo The gizmo to set.
     */
    public setGizmoType(gizmo: "position" | "rotation" | "scaling" | "none"): void {
        this.currentGizmo?.dispose();

        this._scalingGizmo = null;
        this._positionGizmo = null;
        this._rotationGizmo = null;

        switch (gizmo) {
            case "position":
                this._positionGizmo = new PositionGizmo(this._gizmosLayer);
                this._positionGizmo.planarGizmoEnabled = true;
                break;
            case "rotation":
                this._rotationGizmo = new RotationGizmo(this._gizmosLayer);
                break;
            case "scaling":
                this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
                break;
        }

        if (this.currentGizmo) {
            this.currentGizmo.scaleRatio = 2;
            this.currentGizmo.coordinatesMode = this._coordinatesMode;

            if (this._positionGizmo) {
                // A bit of hacking.
                this._positionGizmo.xPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.xPlaneGizmo["_hoverMaterial"].alpha = 1;

                this._positionGizmo.yPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.yPlaneGizmo["_hoverMaterial"].alpha = 1;

                this._positionGizmo.zPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.zPlaneGizmo["_hoverMaterial"].alpha = 1;
            }
        }

        this.setAttachedNode(this._attachedNode);
    }

    /**
     * Sets the node that is attached and controlled by the gizmo.
     * @param node The node to attach to the gizmo.
     */
    public setAttachedNode(node: Node | null): void {
        this._attachedNode = node;

        if (this.currentGizmo) {
            this.currentGizmo.attachedNode = node;
        }
    }

    public getCoordinateMode(): GizmoCoordinatesMode {
        return this._coordinatesMode;
    }

    public setCoordinatesMode(mode: GizmoCoordinatesMode): void {
        this._coordinatesMode = mode;

        if (this.currentGizmo) {
            this.currentGizmo.coordinatesMode = mode;
        }
    }

    public getCoordinatesModeString(): string {
        switch (this._coordinatesMode) {
            case GizmoCoordinatesMode.World: return "World";
            case GizmoCoordinatesMode.Local: return "Local";
        }
    }
}
