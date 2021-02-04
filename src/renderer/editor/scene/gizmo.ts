import {
    PositionGizmo, RotationGizmo, ScaleGizmo, UtilityLayerRenderer, AbstractMesh, Node, TransformNode,
    LightGizmo, Light, IParticleSystem, Sound, Vector3, Quaternion, Camera, CameraGizmo, HemisphericLight,
    SkeletonViewer,
    Mesh,
} from "babylonjs";

import { Nullable } from "../../../shared/types";

import { undoRedo } from "../tools/undo-redo";

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
    private _cameraGizmo: Nullable<CameraGizmo> = null;

    private _initialValue: Nullable<Vector3 | Quaternion> = null;

    private _type: GizmoType = GizmoType.None;
    private _step: number = 0;

    private _skeletonViewer: Nullable<SkeletonViewer> = null;

    /**
     * Constructor.
     */
    public constructor(editor: Editor) {
        this._editor = editor;

        // Create layer
        this._gizmosLayer = new UtilityLayerRenderer(editor.scene!);
        this._gizmosLayer.utilityLayerScene.postProcessesEnabled = false;

        // Register events
        this._editor.removedNodeObservable.add((n) => {
            if (this._currentGizmo && this._currentGizmo.attachedNode === n) {
                this.gizmoType = this._type;
                this.setAttachedNode(null);
                this._currentGizmo.attachedNode = null;
            }
        })
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
        if (type === GizmoType.None) {
            this._initialValue = null;
            return;
        }

        this._currentGizmo = null;

        switch (type) {
            case GizmoType.Position:
                this._currentGizmo = this._positionGizmo = new PositionGizmo(this._gizmosLayer);
                this._positionGizmo.planarGizmoEnabled = true;
                this._positionGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("position"));
                break;
            case GizmoType.Rotation:
                this._currentGizmo = this._rotationGizmo = new RotationGizmo(this._gizmosLayer, undefined, false);
                this._rotationGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("rotationQuaternion"));
                break;
            case GizmoType.Scaling:
                this._currentGizmo = this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
                this._scalingGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("scaling"));
                break;
        }

        if (this._currentGizmo) {
            this._currentGizmo.snapDistance = this._step;
            this._currentGizmo.scaleRatio = 2.5;

            this._currentGizmo.onDragStartObservable.add(() => {
                if (!this._currentGizmo?.attachedMesh) { return; }
                switch (type) {
                    case GizmoType.Position: this._initialValue = this._currentGizmo.attachedMesh.position.clone(); break;
                    case GizmoType.Rotation: this._initialValue = this._currentGizmo.attachedMesh.rotationQuaternion?.clone() ?? Quaternion.Identity(); break;
                    case GizmoType.Scaling: this._initialValue = this._currentGizmo.attachedMesh.scaling.clone(); break;
                }
            });

            this._currentGizmo.xGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            this._currentGizmo.yGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
            this._currentGizmo.zGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());

            if (this._positionGizmo) {
                this._positionGizmo.xPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
                this._positionGizmo.yPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
                this._positionGizmo.zPlaneGizmo.dragBehavior.onDragObservable.add(() => this._notifyGizmoDrag());
                
                // A bit of hacking.
                this._positionGizmo.xPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.xPlaneGizmo["_hoverMaterial"].alpha = 1;

                this._positionGizmo.yPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.yPlaneGizmo["_hoverMaterial"].alpha = 1;

                this._positionGizmo.zPlaneGizmo["_coloredMaterial"].alpha = 0.3;
                this._positionGizmo.zPlaneGizmo["_hoverMaterial"].alpha = 1;
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
    public setAttachedNode(node: Nullable<Node | IParticleSystem | Sound>): void {
        // Skeleton gizmo
        if (this._skeletonViewer) {
            this._skeletonViewer.dispose();
            this._skeletonViewer = null;
        }

        if (node instanceof Mesh && node.skeleton) {
            // this._skeletonViewer = new SkeletonViewer(node.skeleton, node, node.getScene(), false, (node.renderingGroupId > 0 ) ? node.renderingGroupId + 1 : 1, {
            //     pauseAnimations: false, 
            //     returnToRest: false, 
            //     computeBonesUsingShaders: true, 
            //     useAllBones: false,
            //     displayMode: SkeletonViewer.DISPLAY_SPHERE_AND_SPURS,
            //     displayOptions: {
            //         sphereBaseSize: 1,
            //         sphereScaleUnit: 10, 
            //         sphereFactor: 0.9, 
            //         midStep: 0.1,
            //         midStepFactor: 0.05,
            //     }
            // });
        }

        // Light?
        if (node instanceof Light) {
            this._setLightGizmo(node);
        } else {
            this._lightGizmo?.dispose();
            this._lightGizmo = null;
        }

        // Camera?
        if (node instanceof Camera) {
            this._setCameraGizmo(node);
        } else {
            this._cameraGizmo?.dispose();
            this._cameraGizmo = null;
        }

        // Camera or light?
        if (this._cameraGizmo || this._lightGizmo) {
            return;
        }

        // Mesh or transform node
        if (!node || !this._currentGizmo) { return; }

        // CHeck node has a billboard mode
        if (node instanceof TransformNode && node.billboardMode !== TransformNode.BILLBOARDMODE_NONE && this._type === GizmoType.Rotation) {
            return;
        }

        if (node instanceof AbstractMesh) {
            this._currentGizmo.attachedMesh = node;
        } else if (node instanceof Node) {
            this._currentGizmo.attachedNode = node;
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

        if (!this._currentGizmo) { return; }
        if ((this._currentGizmo instanceof PositionGizmo || this._currentGizmo instanceof ScaleGizmo) && light instanceof HemisphericLight) { return; }

        this._currentGizmo.attachedMesh = this._lightGizmo.attachedMesh;
    }

    /**
     * Sets the camera gizmo.
     */
    private _setCameraGizmo(camera: Camera): void {
        if (!this._cameraGizmo) {
            this._cameraGizmo = new CameraGizmo(this._gizmosLayer);
        }
        
        this._cameraGizmo.camera = camera;
        this._cameraGizmo.displayFrustum = true;

        if (this._currentGizmo) {
            this._currentGizmo.attachedNode = this._cameraGizmo.camera;
        }
    }

    /**
     * Disposes the currently enabled gizmos.
     */
    private _disposeGizmos(): void {
        if (this._positionGizmo) { this._positionGizmo.dispose(); }
        if (this._rotationGizmo) { this._rotationGizmo.dispose(); }
        if (this._scalingGizmo) { this._scalingGizmo.dispose(); }

        if (this._lightGizmo) { this._lightGizmo.dispose(); }
        if (this._cameraGizmo) { this._cameraGizmo.dispose(); }

        this._currentGizmo = null;

        this._positionGizmo = null;
        this._rotationGizmo = null;
        this._scalingGizmo = null;

        this._lightGizmo = null;
        this._cameraGizmo = null;
    }

    /**
     * Notifies that the current gizmo is dragged.
     */
    private _notifyGizmoDrag(): void {
        if (!this._currentGizmo) { return; }
        
        this._editor.inspector.refreshDisplay();
    }

    /**
     * Notifies that the current gizmo ended dragging.
     * This is the place to support undo/redo.
     */
    private _notifyGizmoEndDrag(propertyPath: string): void {
        if (!this._initialValue) { return; }

        const attachedMesh = this._currentGizmo?.attachedMesh;
        if (!attachedMesh) { return; }

        const property = attachedMesh[propertyPath];
        if (!property || this._initialValue.equals(property)) { return; }

        const initialValue = this._initialValue.clone();
        const endValue = property.clone();

        undoRedo.push({
            common: () => this._editor.inspector.refreshDisplay(),
            redo: () => attachedMesh[propertyPath].copyFrom(endValue),
            undo: () => attachedMesh[propertyPath].copyFrom(initialValue),
        });

        this._initialValue = null;
    }
}
