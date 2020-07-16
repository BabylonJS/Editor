import { Nullable } from "../../../../shared/types";

import { PointerEventTypes, Observer, PointerInfo, PickingInfo, Mesh, Vector3, AbstractMesh } from "babylonjs";

import { Editor } from "../../editor";

import { Tools } from "../../tools/tools";

import { SceneSettings } from "../../scene/settings";

import { Volume } from "../tools/volume";

export class FoliagePainter {
    private _editor: Editor;
    private _volume: Volume;

    private _globalPointerObserver: Nullable<Observer<PointerInfo>>;

    private _lastPickingInfo: Nullable<PickingInfo> = null;
    private _layerPointerObserver: Nullable<Observer<PointerInfo>>;

    private _pointerDown: boolean = false;
    private _removing: boolean = false;

    /**
     * Defines the array of all available meshes to draw.
     */
    public meshes: Nullable<Mesh>[] = [];

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this._volume = new Volume(editor.scene!);

        this._globalPointerObserver = editor.scene!.onPointerObservable.add((infos) => this._processGlobalPointer(infos));
        this._layerPointerObserver = this._volume.layer.utilityLayerScene.onPointerObservable.add((infos) => this._processLayerPointer(infos));
    }

    /**
     * Disposes the volume painter.
     */
    public dispose(): void {
        if (this._globalPointerObserver) { this._editor.scene!.onPointerObservable.remove(this._globalPointerObserver); }
        if (this._layerPointerObserver) { this._volume.layer.utilityLayerScene.onPointerObservable.remove(this._layerPointerObserver); }

        this.reset();
        this._volume.dispose();
    }

    /**
     * Resets the foliage painter.
     */
    public reset(): void {
        this.meshes.forEach((m) => {
            if (m?.metadata?.waitingFoliage) { m.dispose(); }
        });

        this.meshes = [null];
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
                this._updateVolume();

                if (this._pointerDown) {
                    if (this._removing) {
                        this._remove();
                    } else {
                        this._paint();
                    }
                }
                return;
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

    /**
     * Processes the layer pointer.
     */
    private _processLayerPointer(info: PointerInfo): void {
        if (!SceneSettings.IsCameraLocked) { return; }

        if (info.type === PointerEventTypes.POINTERDOWN) {
            this._pointerDown = true;
            this._removing = info.event.button === 2;
            return;
        }

        if (info.type === PointerEventTypes.POINTERUP) {
            this._pointerDown = false;
            this._removing = false;

            this._editor.graph.refresh();
            return;
        }
    }

    /**
     * Updates the current volume.
     */
    private _updateVolume(): void {
        const scene = this._editor.scene!;

        this._lastPickingInfo = scene.pick(scene.pointerX, scene.pointerY, (n) => !n.metadata?.isFoliage && this.meshes.indexOf(n as Mesh) === -1, false, scene.activeCamera);
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

    /**
     * Paint!
     */
    private _paint(): void {
        if (!this._lastPickingInfo?.pickedPoint || !this._lastPickingInfo?.pickedMesh) { return; }

        // Check can paint
        const nearMesh = this._editor.scene!.meshes.find((m) => m.metadata?.isFoliage && Vector3.Distance(m.getAbsolutePosition(), this._lastPickingInfo!.pickedPoint!) < this._volume.radius);
        if (nearMesh) {
            return;
        }

        // Choose mesh
        const meshes = this.meshes.filter((m) => m);
        const mesh = meshes[(Math.random() * meshes.length) >> 0];

        if (!mesh) { return; }

        const position = new Vector3(
            this._lastPickingInfo.pickedPoint.x, // + this._volume.radius * Math.random(),
            this._lastPickingInfo.pickedPoint.y, // + this._volume.radius * Math.random(),
            this._lastPickingInfo.pickedPoint.z, // + this._volume.radius * Math.random(),
        );

        let targetMesh: AbstractMesh;
        if (mesh.metadata?.waitingFoliage === true) {
            delete mesh.metadata.waitingFoliage;
            mesh.doNotSerialize = false;
            targetMesh = mesh;
        } else {
            targetMesh = mesh.createInstance(`${mesh.name}_foliage`);
        }

        targetMesh.position.copyFrom(position);
        targetMesh.scaling.scaleInPlace(Math.random());
        // targetMesh.rotate(new Vector3(0, 1, 0), Math.PI * 2 * Math.random(), Space.LOCAL);
        targetMesh.computeWorldMatrix(true);
        targetMesh.setParent(this._lastPickingInfo.pickedMesh);
        targetMesh.id = Tools.RandomId();

        targetMesh.metadata = targetMesh.metadata ?? { };
        targetMesh.metadata.isFoliage = true;
    }

    /**
     * Removes all the meshes near the cursor.
     */
    private _remove(): void {
        if (!this._lastPickingInfo?.pickedPoint) { return; }

        const nearMeshes = this._editor.scene!.meshes.filter((m) => m.metadata?.isFoliage && Vector3.Distance(m.getAbsolutePosition(), this._lastPickingInfo!.pickedPoint!) < this._volume.radius);
        nearMeshes.forEach((nm) => {
            if (nm.isAnInstance) {
                nm.dispose();
            }
        });
    }
}
