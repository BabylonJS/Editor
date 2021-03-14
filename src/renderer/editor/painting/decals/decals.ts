import { Nullable } from "../../../../shared/types";

import { Observer, PointerInfo, PointerEventTypes, Vector3, Material, PickingInfo, Mesh } from "babylonjs";

import { Editor } from "../../editor";

import { SceneSettings } from "../../scene/settings";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { PreviewCanvasEventType } from "../../components/preview";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";

import { Decal } from "../tools/decal";

export class DecalsPainter {
    private _editor: Editor;
    private _decal: Decal;

    private _globalPointerObserver: Nullable<Observer<PointerInfo>>;
    private _layerPointerObserver: Nullable<Observer<PointerInfo>>;

    private _canvasEventObserver: Nullable<Observer<PreviewCanvasEventType>>;

    private _lastPickingInfo: Nullable<PickingInfo> = null;

    /**
     * Defines wether or not the created decals receive shadows or not.
     */
    public receiveShadows: boolean = true;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this._decal = new Decal(editor.scene!);

        this._globalPointerObserver = editor.scene!.onPointerObservable.add((infos) => this._processGlobalPointer(infos));
        this._layerPointerObserver = this._decal.layer.utilityLayerScene.onPointerObservable.add((infos) => this._processLayerPointer(infos));

        this._canvasEventObserver = editor.preview.onCanvasEventObservable.add((event) => this._canvasEvent(event));
    }

    /**
     * Disposes the decal painter.
     */
    public dispose(): void {
        if (this._globalPointerObserver) { this._editor.scene!.onPointerObservable.remove(this._globalPointerObserver); }
        if (this._layerPointerObserver) { this._decal.layer.utilityLayerScene.onPointerObservable.remove(this._layerPointerObserver); }

        if (this._canvasEventObserver) { this._editor.preview.onCanvasEventObservable.remove(this._canvasEventObserver); }

        this._decal.dispose();
    }

    /**
     * Gets the current size for decal.
     */
    public get size(): number {
        return this._decal.size.z;
    }

    /**
     * Sets the current size for decal.
     */
    public set size(size: number) {
        this._decal.size.z = size;
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current width for decal.
     */
    public get width(): number {
        return this._decal.size.x;
    }

    /**
     * Sets the current width for for decal.
     */
    public set width(width: number) {
        this._decal.size.x = width;
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current height of decal.
     */
    public get height(): number {
        return this._decal.size.y;
    }

    /**
     * Sets the current height of decal.
     */
    public set height(height: number) {
        this._decal.size.y = height;
        this._updateDecalWithLastPickInfo();
    }
    
    /**
     * Gets the current angle for decal.
     */
    public get angle(): number {
        return this._decal.angle;
    }

    /**
     * Sets the current angle for decal.
     */
    public set angle(angle: number) {
        this._decal.angle = angle;
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current material used for decal.
     */
    public get material(): Nullable<Material> {
        return this._decal.material;
    }

    /**
     * Sets the current material used for decal.
     */
    public set material(material: Nullable<Material>) {
        this._decal.material = material;
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Sets wether or not the tool is enabled.
     */
    public set enabled(enabled: boolean) {
        if (!enabled) {
            this._decal.disposeMesh();
        } else {
            this._updateDecalWithLastPickInfo();
        }
    }

    /**
     * Processes the global pointer.
     */
    private _processGlobalPointer(info: PointerInfo): void {
        if (info.type === PointerEventTypes.POINTERMOVE) {
            if (SceneSettings.IsCameraLocked) {
                return this._updateDecal(false);
            } else {
                this._decal.disposeMesh();
            }
        }

        if (!SceneSettings.IsCameraLocked) { return; }

        if (info.type === PointerEventTypes.POINTERWHEEL) {
            const event = info.event as WheelEvent;
            const delta = event.deltaY * -0.001;

            if (info.event.altKey) {
                return this._rotateDecal(delta);
            } else {
                return this._sizeDecal(delta);
            }
        }
    }

    /**
     * Processes the layer pointer.
     */
    private _processLayerPointer(info: PointerInfo): void {
        if (!SceneSettings.IsCameraLocked) { return; }

        if (info.type === PointerEventTypes.POINTERUP) {
            return this._updateDecal(true);
        }
    }

    /**
     * Called on a canvas event happens.
     */
    private _canvasEvent(event: PreviewCanvasEventType): void {
        switch (event) {
            case PreviewCanvasEventType.Blurred:
                this._decal.disposeMesh();
                break;
        }
    }

    /**
     * Sizes the current decal using the given delta.
     */
    private _sizeDecal(delta: number): void {
        this._decal.size.addInPlace(new Vector3(delta, delta, delta));

        if (this._decal.size.x < 0) {
            this._decal.size.set(0, 0, 0);
        }

        this._updateDecalWithLastPickInfo();

        InspectorNotifier.NotifyChange(this._decal);
    }

    /**
     * Rotates the current decal using the given delta.
     */
    private _rotateDecal(delta: number): void {
        this._decal.angle += delta;
        this._updateDecalWithLastPickInfo();

        InspectorNotifier.NotifyChange(this._decal);
    }

    /**
     * Updates the decal.
     */
    private _updateDecal(keepInScene: boolean): void {
        const scene = this._editor.scene!;

        this._lastPickingInfo = scene.pick(scene.pointerX, scene.pointerY, (n) => !n.metadata?.isDecal, false, scene.activeCamera);
        if (!this._lastPickingInfo) { return; }

        if (keepInScene) {
            this._decal.disposeMesh();
            
            const clonedPickingInfo = this._lastPickingInfo;
            let decal: Nullable<Mesh> = null;

            undoRedo.push({
                common: () => this._editor.graph.refresh(),
                redo: () => {
                    decal = this._decal.createDecal(clonedPickingInfo);
                    if (decal) {
                        decal.name = this.material?.name ?? "new decal";
                        decal.id = Tools.RandomId();
                        decal.metadata = { isDecal: true };
        
                        decal.receiveShadows = this.receiveShadows;

                        if (clonedPickingInfo.pickedMesh && !clonedPickingInfo.pickedMesh.isDisposed()) {
                            decal.setParent(clonedPickingInfo.pickedMesh);
                        }
                    }
                },
                undo: () => {
                    if (decal && !decal.isDisposed()) {
                        decal.dispose();
                    }
                },
            })
        } else {
            this._decal.updateDecal(this._lastPickingInfo);
        }
    }

    /**
     * Updates the decal using the last picking info.
     */
    private _updateDecalWithLastPickInfo(): void {
        if (this._lastPickingInfo) {
            this._decal.updateDecal(this._lastPickingInfo);
        }
    }
}
