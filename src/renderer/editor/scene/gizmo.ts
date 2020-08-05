import {
    PositionGizmo, RotationGizmo, ScaleGizmo, UtilityLayerRenderer, AbstractMesh, Node, TransformNode,
    LightGizmo, Light, IParticleSystem, Sound, Vector3, Quaternion, Camera,
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

    private _initialValue: Nullable<Vector3 | Quaternion> = null;

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
        if (type === GizmoType.None) {
            this._initialValue = null;
            return;
        }

        this._currentGizmo = null;

        switch (type) {
            case GizmoType.Position:
                this._currentGizmo = this._positionGizmo = new PositionGizmo(this._gizmosLayer);
                this._positionGizmo.planarGizmoEnabled = true;
                this._currentGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("position"));
                break;
            case GizmoType.Rotation:
                this._currentGizmo = this._rotationGizmo = new RotationGizmo(this._gizmosLayer, undefined, false);
                this._currentGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("rotationQuaternion"));
                break;
            case GizmoType.Scaling:
                this._currentGizmo = this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
                this._currentGizmo.onDragEndObservable.add(() => this._notifyGizmoEndDrag("scaling"));
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
        // Light?
        if (node instanceof Light) {
            return this._setLightGizmo(node);
        } else {
            this._lightGizmo?.dispose();
            this._lightGizmo = null;
        }

        // Mesh or transform node
        if (!node || !this._currentGizmo) { return; }

        if (node instanceof AbstractMesh) {
            this._currentGizmo.attachedMesh = node;
        } else if (node instanceof TransformNode || node instanceof Camera) {
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

        if (this._currentGizmo) {
            this._currentGizmo.attachedMesh = this._lightGizmo.attachedMesh;
        }
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
            common: () => this._editor.inspector.refresh(),
            redo: () => attachedMesh[propertyPath] = endValue,
            undo: () => attachedMesh[propertyPath] = initialValue,
        });

        this._initialValue = null;
    }
}

/**
 * Defines the problem found in alpha.30, when a scale is -1 then movements are inverted using gizmos.
var createScene = function () {
    // Setup scene
    var scene = new BABYLON.Scene(engine);
	var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setPosition(new BABYLON.Vector3(0, 10, 5));
    camera.attachControl(canvas, true);
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    var ground = BABYLON.Mesh.CreateGround("ground1", 6, 6, 2, scene);
    ground.position.y= -1

    // Create gizmo
    var gizmo = new BABYLON.PositionGizmo()
    gizmo.ignoreChildren = true;

    // Import gltf model
    BABYLON.SceneLoader.ImportMesh('',"https://raw.githubusercontent.com/PatrickRyanMS/SampleModels/master/Yeti/glTF/Yeti_IdleUnity.gltf", "", scene, function (container) {
        var gltfMesh = container[0]
        alert(gltfMesh.name);
        var bb = BABYLON.BoundingBoxGizmo.MakeNotPickableAndWrapInBoundingBox(gltfMesh)

        gizmo.attachedMesh = bb;
    });

    return scene;
};
 */