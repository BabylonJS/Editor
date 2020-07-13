import { Nullable } from "../../../../shared/types";

import { PointerEventTypes, Observer, PointerInfo, PickingInfo } from "babylonjs";

import { Editor } from "../../editor";

import { Volume } from "../tools/volume";
import { SceneSettings } from "../../scene/settings";

export class FoliagePainter {
    private _editor: Editor;
    private _volume: Volume;

    private _globalPointerObserver: Nullable<Observer<PointerInfo>>;

    private _lastPickingInfo: Nullable<PickingInfo> = null;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this._volume = new Volume(editor.scene!);

        this._globalPointerObserver = editor.scene!.onPointerObservable.add((infos) => this._processGlobalPointer(infos));
    }

    /**
     * Disposes the volume painter.
     */
    public dispose(): void {
        if (this._globalPointerObserver) { this._editor.scene!.onPointerObservable.remove(this._globalPointerObserver); }

        this._volume.dispose();
    }

    /**
     * Gets the current radius of the volume.
     */
    public get radius(): number {
        return this._volume.radius;
    }

    /**
     * Sets the current radius of the volume.
     */
    public set radius(radius: number) {
        this._volume.radius = radius;
        this._resetVolume();
    }

    /**
     * Processes the global pointer.
     */
    private _processGlobalPointer(info: PointerInfo): void {
        if (info.type === PointerEventTypes.POINTERMOVE) {
            if (SceneSettings.IsCameraLocked) {
                this._volume.createMesh();
                return this._updateVolume();
            } else {
                return this._volume.disposeMesh();
            }
        }

        if (!SceneSettings.IsCameraLocked) { return; }

        if (info.type === PointerEventTypes.POINTERWHEEL) {
            const event = info.event as WheelEvent;
            const delta = event.deltaY * -0.001;

            return this._sizeVolume(delta);
        }
    }

    private _updateVolume(): void {
        const scene = this._editor.scene!;

        this._lastPickingInfo = scene.pick(scene.pointerX, scene.pointerY, undefined, false, scene.activeCamera);
        if (!this._lastPickingInfo) { return; }

        this._volume.updateMesh(this._lastPickingInfo);
    }

    /**
     * Sizes the current volume using the given delta.
     */
    private _sizeVolume(delta: number): void {
        this._volume.radius += delta;

        if (this._volume.radius < 0) {
            this._volume.radius = 0;
        }

        this._volume.disposeMesh();
        this._volume.createMesh();

        this._updateVolumeWithLastPickInfo();
    }

    /**
     * Resets the volume.
     */
    private _resetVolume(): void {
        this._volume.disposeMesh();
        this._volume.createMesh();

        this._updateVolumeWithLastPickInfo();
    }

    /**
     * Updates the volume using the last picking info.
     */
    private _updateVolumeWithLastPickInfo(): void {
        if (this._lastPickingInfo) {
            this._volume.updateMesh(this._lastPickingInfo);
        }
    }
}
