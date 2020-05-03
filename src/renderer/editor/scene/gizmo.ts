import { PositionGizmo, RotationGizmo, ScaleGizmo, UtilityLayerRenderer, AbstractMesh, Node, TransformNode, LightGizmo, Light, IParticleSystem } from "babylonjs";

import { Nullable } from "../../../shared/types";

import { Editor } from "../editor";

export enum GizmoType {
    None = 0,
    Position,
    Rotation,
    Scaling,
}

export class SceneGizmo {
    private _editor: Editor;

    public _gizmosLayer: UtilityLayerRenderer;

    private _currentGizmo: Nullable<PositionGizmo | RotationGizmo | ScaleGizmo> = null;
    private _positionGizmo: Nullable<PositionGizmo> = null;
    private _rotationGizmo: Nullable<RotationGizmo> = null;
    private _scalingGizmo: Nullable<ScaleGizmo> = null;
    private _lightGizmo: Nullable<LightGizmo> = null;

    private _type: GizmoType = GizmoType.None;
    private _step: number = 0;

    /**
     * Constructor.
     */
    public constructor(editor: Editor) {
        this._editor = editor;

        // Create layer
        this._gizmosLayer = new UtilityLayerRenderer(editor.scene!);
        this._gizmosLayer.utilityLayerScene.postProcessesEnabled = false;
    }

    /**
     * Returns the current type of gizmo being used in the preview.
     */
    public get gizmoType(): GizmoType {
        return this._type;
    }

    /**
     * Sets the type of gizm to be used in the preview.
     */
    public set gizmoType(type: GizmoType) {
        this._type = type;

        this._disposeGizmos();
        if (type === GizmoType.None) { return; }

        this._currentGizmo = null;

        switch (type) {
            case GizmoType.Position:
                this._currentGizmo = this._positionGizmo = new PositionGizmo(this._gizmosLayer);
                this._positionGizmo.planarGizmoEnabled = true;
                break;
            case GizmoType.Rotation:
                this._currentGizmo = this._rotationGizmo = new RotationGizmo(this._gizmosLayer, undefined, false);
                break;
            case GizmoType.Scaling:
                this._currentGizmo = this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
                break;
        }

        if (this._currentGizmo) {
            this._currentGizmo.snapDistance = this._step;
            this._currentGizmo.scaleRatio = 2.5;

            this._currentGizmo.xGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            this._currentGizmo.yGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            this._currentGizmo.zGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());

            if (this._positionGizmo) {
                this._positionGizmo.xPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
                this._positionGizmo.yPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
                this._positionGizmo.zPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            } else if (this._scalingGizmo) {
                this._scalingGizmo.uniformScaleGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            }

            const node = this._editor.graph.lastSelectedObject;
            this.setAttachedNode(node);
        }
    }

    /**
     * Returns the current step used while using the gizmos.
     */
    public get gizmoStep(): number {
        return this._step;
    }

    /**
     * Sets the current step used while using the gizmos.
     */
    public set gizmoStep(steps: number) {
        this._step = steps;
        if (this._currentGizmo) { this._currentGizmo.snapDistance = steps; }
    }

    /**
     * Sets the given node attached to the current gizmos if exists.
     * @param node the node to attach to current gizmos if exists.
     */
    public setAttachedNode(node: Nullable<Node | IParticleSystem>): void {
        // Light?
        if (node instanceof Light) {
            return this._setLightGizmo(node);
        } else {
            this._lightGizmo?.dispose();
            this._lightGizmo = null;
        }

        // Mesh or transform node
        if (!node || !this._currentGizmo) { return; }

        if (node instanceof AbstractMesh || node instanceof TransformNode) {
            this._currentGizmo.attachedMesh = node as any;
        }
    }

    /**
     * Sets the light gizmo.
     */
    private _setLightGizmo(light: Light): void {
        if (!this._lightGizmo) {
            this._lightGizmo = new LightGizmo(this._gizmosLayer);
            this._lightGizmo.scaleRatio = 2.5;
        }

        this._lightGizmo.light = light;
    }

    /**
     * Disposes the currently enabled gizmos.
     */
    private _disposeGizmos(): void {
        if (this._positionGizmo) { this._positionGizmo.dispose(); }
        if (this._rotationGizmo) { this._rotationGizmo.dispose(); }
        if (this._scalingGizmo) { this._scalingGizmo.dispose(); }

        this._currentGizmo = null;
        this._positionGizmo = null;
        this._rotationGizmo = null;
        this._scalingGizmo = null;
    }

    /**
     * Notifies that the current gizmo is dragged.
     */
    private _notifyGizmoDrag(): void {
        if (!this._currentGizmo) { return; }
        
        this._editor.inspector.refreshDisplay();
    }
}
