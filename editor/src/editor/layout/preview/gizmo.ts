import {
    GizmoCoordinatesMode, Node, Observable, PositionGizmo, Quaternion, RotationGizmo, ScaleGizmo, Scene,
    UtilityLayerRenderer, Vector3, CameraGizmo,
} from "babylonjs";

import { registerUndoRedo } from "../../../tools/undoredo";
import { isCamera, isLight } from "../../../tools/guards/nodes";
import { isQuaternion, isVector3 } from "../../../tools/guards/math";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../tools/light/shadows";

export const onGizmoNodeChangedObservable = new Observable<Node>();

export class EditorPreviewGizmo {
    /**
     * @internal
     */
    public _gizmosLayer: UtilityLayerRenderer;

    private _scalingGizmo: ScaleGizmo | null = null;
    private _positionGizmo: PositionGizmo | null = null;
    private _rotationGizmo: RotationGizmo | null = null;

    private _coordinatesMode: GizmoCoordinatesMode = GizmoCoordinatesMode.Local;

    private _cameraGizmo: CameraGizmo | null = null;

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
                this._attachVector3UndoRedoEvents(this._positionGizmo, "position");
                break;
            case "rotation":
                this._rotationGizmo = new RotationGizmo(this._gizmosLayer);
                this._attachRotationUndoRedoEvents(this._rotationGizmo);
                break;
            case "scaling":
                this._scalingGizmo = new ScaleGizmo(this._gizmosLayer);
                this._attachVector3UndoRedoEvents(this._scalingGizmo, "scaling");
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
     * Gets the reference to the node that is attached and controlled by the gizmo.
     */
    public get attachedNode(): Node | null {
        return this._attachedNode;
    }

    /**
     * Sets the node that is attached and controlled by the gizmo.
     * @param node The node to attach to the gizmo.
     */
    public setAttachedNode(node: Node | null): void {
        this._attachedNode = node;

        if (isCamera(node)) {
            this._cameraGizmo ??= new CameraGizmo(this._gizmosLayer);
            this._cameraGizmo.camera = node;
            this._cameraGizmo.attachedNode = node;
        } else {
            this._cameraGizmo?.dispose();
        }

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

    private _attachVector3UndoRedoEvents(gizmo: PositionGizmo | ScaleGizmo | RotationGizmo, property: "position" | "scaling"): void {
        let temporaryNode: Node | null = null;
        let temporaryOldValue: Vector3 | null = null;

        gizmo.onDragStartObservable.add(() => {
            if (!this._attachedNode) {
                return;
            }

            temporaryNode = this._attachedNode;

            const value = this._attachedNode[property];
            temporaryOldValue = isVector3(value) ? value.clone() : null;
        });

        gizmo.onDragObservable.add(() => {
            if (isLight(temporaryNode)) {
                updateLightShadowMapRefreshRate(temporaryNode);
                updatePointLightShadowMapRenderListPredicate(temporaryNode);
            }
        });

        gizmo.onDragEndObservable.add(() => {
            if (!temporaryNode) {
                return;
            }

            const node = temporaryNode;
            const oldValue = temporaryOldValue?.clone();

            const newValueRef = temporaryNode[property];
            const newValue = isVector3(newValueRef) ? newValueRef.clone() : null;

            registerUndoRedo({
                undo: () => {
                    const valueRef = node[property];
                    if (isVector3(valueRef) && oldValue) {
                        valueRef.copyFrom(oldValue);
                    } else {
                        node[property] = oldValue?.clone() ?? null;
                    }

                    if (isLight(node)) {
                        updateLightShadowMapRefreshRate(node);
                        updatePointLightShadowMapRenderListPredicate(node);
                    }

                    this.setAttachedNode(node);
                },
                redo: () => {
                    const valueRef = node[property];
                    if (isVector3(valueRef) && newValue) {
                        valueRef.copyFrom(newValue);
                    } else {
                        node[property] = newValue?.clone() ?? null;
                    }

                    if (isLight(node)) {
                        updateLightShadowMapRefreshRate(node);
                        updatePointLightShadowMapRenderListPredicate(node);
                    }

                    this.setAttachedNode(node);
                },
            });

            onGizmoNodeChangedObservable.notifyObservers(node);
        });
    }

    private _attachRotationUndoRedoEvents(gizmo: RotationGizmo): void {
        let temporaryNode: Node | null = null;
        let temporaryOldValue: Vector3 | Quaternion | null = null;

        gizmo.onDragStartObservable.add(() => {
            if (!this._attachedNode) {
                return;
            }

            temporaryNode = this._attachedNode;

            const value = this._attachedNode["rotationQuaternion"] ?? this._attachedNode["rotation"];
            temporaryOldValue = isVector3(value) || isQuaternion(value) ? value.clone() : null;
        });

        gizmo.onDragObservable.add(() => {
            if (isLight(temporaryNode)) {
                updateLightShadowMapRefreshRate(temporaryNode);
                updatePointLightShadowMapRenderListPredicate(temporaryNode);
            }
        });

        gizmo.onDragEndObservable.add(() => {
            if (!temporaryNode) {
                return;
            }

            const node = temporaryNode;
            const oldValue = temporaryOldValue?.clone();

            const newValueRef = temporaryNode["rotationQuaternion"] ?? temporaryNode["rotation"];
            const newValue = isVector3(newValueRef) || isQuaternion(newValueRef) ? newValueRef.clone() : null;

            registerUndoRedo({
                undo: () => {
                    const valueRef = node["rotationQuaternion"] ?? node["rotation"];
                    if (isVector3(valueRef) && isVector3(oldValue)) {
                        valueRef.copyFrom(oldValue);
                    } else if (isQuaternion(valueRef) && isQuaternion(oldValue)) {
                        valueRef.copyFrom(oldValue);
                    }

                    if (isLight(node)) {
                        updateLightShadowMapRefreshRate(node);
                        updatePointLightShadowMapRenderListPredicate(node);
                    }

                    this.setAttachedNode(node);
                },
                redo: () => {
                    const valueRef = node["rotationQuaternion"] ?? node["rotation"];
                    if (isVector3(valueRef) && isVector3(newValue)) {
                        valueRef.copyFrom(newValue);
                    } else if (isQuaternion(valueRef) && isQuaternion(newValue)) {
                        valueRef.copyFrom(newValue);
                    }

                    if (isLight(node)) {
                        updateLightShadowMapRefreshRate(node);
                        updatePointLightShadowMapRenderListPredicate(node);
                    }

                    this.setAttachedNode(node);
                },
            });

            onGizmoNodeChangedObservable.notifyObservers(node);
        });
    }
}
