import { Nullable } from "../../../../shared/types";

import {
    PointerInfo, PointerEventTypes, StandardMaterial, DynamicTexture, Epsilon, PickingInfo, GroundMesh,
} from "babylonjs";

import { Editor } from "../../editor";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { Decal } from "../tools/decal";

import { AbstractPaintingTool } from "../abstract-tool";

import { paintTerrainElevation } from "./elevate";
import { configureTerrainAndData, ITerrainPainterData, computeTerrainNormals } from "./data";

export enum TerrainSculptType {
    Elevation = 0,
}

export class TerrainSculptPainter extends AbstractPaintingTool {
    /**
     * Defines the absolute path to the brush texture.
     */
    public brushAbsolutePath: Nullable<string> = null;

    /**
     * Defines the current type of tool used to sculpt the terrain.
     */
    public type: TerrainSculptType = TerrainSculptType.Elevation;

    private _decal: Decal;
    private _decalTexture: DynamicTexture;


    private _lastRenderId: number = -1;
    private _pick: Nullable<PickingInfo> = null;

    private _isPointerDown: boolean = false;
    private _targetMesh: Nullable<GroundMesh> = null;

    private _data: Nullable<ITerrainPainterData> = null;
    
    public _size: number = 1;
    public _strength: number = 1;
    public _attenuation: number = 0;
    public _elevating: boolean = true;
    public _brushData: Nullable<ImageData> = null;

    /**
     * Constructor.
     * @param editor defines the reference to the editor.
     */
    public constructor(editor: Editor) {
        super(editor);

        this._createDecal();
    }

    /**
     * Gets the minimum distance that should be checked between existing thin instances to
     * determine if the current instance can be painted or not.
     */
    public get size(): number {
        return this._size;
    }

    /**
     * Sets the minimum distance that should be checked between existing thin instances to
     * determine if the current instance can be painted or not.
     */
    public set size(size: number) {
        this._size = size;
        this._decal.size.z = size;
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current strength set on the tool.
     */
    public get strength(): number {
        return this._strength;
    }

    /**
     * Sets the current strength set on the tool.
     */
    public set strength(strength: number) {
        this._strength = strength;
        this._updateDecalTexture();
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current attenuation set on the tool.
     */
    public get attenuation(): number {
        return this._attenuation;
    }

    /**
     * Sets the current attenuation set on the tool.
     */
    public set attenuation(attenuation: number) {
        this._attenuation = attenuation;
        this._updateDecalTexture();
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Gets the current data of the brush containing the dimensions and the pixels data.
     */
    public get brushData(): Nullable<ImageData> {
        return this._brushData;
    }

    /**
     * Sets the current data of the brush containing the dimensions and the pixels data.
     */
    public set brushData(data: Nullable<ImageData>) {
        this._brushData = data;
        this._updateDecalTexture();
        this._updateDecalWithLastPickInfo();
    }

    /**
     * Disposes the painting tool.
     */
    public dispose(): void {
        super.dispose();

        this._decal.dispose();
    }

    /**
     * To be implemeneted.
     * This function is called on a pointer event is trigerred on the main scene in the editor.
     * @param info defines the reference to the pointer event informations.
     */
    protected onPointerEvent(info: PointerInfo): void {
        switch (info.type) {
            case PointerEventTypes.POINTERDOWN: return this._handlePointerDown(info);
            case PointerEventTypes.POINTERMOVE: return this._handlePointerMove();
            case PointerEventTypes.POINTERWHEEL: return this._handlePointerWheel(info);
            case PointerEventTypes.POINTERUP: return this._handlePointerUp();
        }
    }

    /**
     * Called on the Control key (or Command key) is released. This is the where
     * the painting tool should be removed here.
     */
    protected onControlKeyReleased(): void {
        this._isPointerDown = false;

        this._decal.disposeMesh();
        this.editor.scene!.meshes.forEach((m) => m.isPickable = true);

        this._targetMesh = null;
    }

    /**
     * Called on the pointer is down.
     */
    private _handlePointerDown(info: PointerInfo): void {
        const button = info.event.button;
        if (button !== 0 && button !== 2) {
            return;
        }

        this._isPointerDown = true;
        this._elevating = info.event.button === 0;
    }

    /**
     * Called on the pointer moves and painting tool is enabled.
     */
    private _handlePointerMove(): void {
        const renderId = this.editor.scene!.getRenderId();
        if (renderId === this._lastRenderId) {
            return;
        }

        this._lastRenderId = renderId;

        const x = this.editor.scene!.pointerX;
        const y = this.editor.scene!.pointerY;

        this._pick = this.editor.scene!.pick(x, y, (m) => m.getClassName() === "GroundMesh", false, this.editor.scene!.activeCamera);

        if (this._pick) {
            if (!this._targetMesh && this._pick.pickedMesh) {
                this._targetMesh = this._pick.pickedMesh as GroundMesh;

                this._data = configureTerrainAndData(this._targetMesh);

                if (this._isPointerDown && this._pick.pickedMesh !== this._targetMesh) {
                    return;
                }
            }

            this._decal.updateDecal(this._pick);

            if (this._isPointerDown) {
                this._paint();
            }
        }
    }

    /**
     * Called on the pointer wheel is moving and tool is enabled.
     */
    private _handlePointerWheel(info: PointerInfo): void {
        const event = info.event as WheelEvent;
        const delta = event.deltaY * -0.001;

        const distance = Math.max(Epsilon, this._size + delta);
        this.size = distance;
        this._handlePointerMove();

        InspectorNotifier.NotifyChange(this, { caller: this, waitMs: 100 });
    }

    /**
     * Called on the pointer is up and painting tool is enabled.
     */
    private _handlePointerUp(): void {
        this._isPointerDown = false;

        if (this._pick?.pickedPoint) {
            this._paint();
        }

        this._onPaintEnd();
    }

    private _paint(): void {
        if (!this._data) {
            return;
        }

        switch (this.type) {
            case TerrainSculptType.Elevation:
                paintTerrainElevation(this._data, this, this._pick!.pickedPoint!);
                break;
        }
    }

    private _onPaintEnd(): void {
        if (this._data) {
            computeTerrainNormals(this._data);
        }
    }

    /**
     * Creates the decal tool and configures its material.
     */
    private _createDecal(): void {
        this._decalTexture = new DynamicTexture("thinInstanceDynamicTexture", 512, this.layerScene.utilityLayerScene, false);
        this._decalTexture.hasAlpha = true;

        this._updateDecalTexture();

        const material = new StandardMaterial("thinInstanceDecalMaterial", this.layerScene.utilityLayerScene);
        material.alpha = 0.5;
        material.disableLighting = true;
        material.useAlphaFromDiffuseTexture = true;
        material.diffuseTexture = this._decalTexture;
        material.emissiveTexture = this._decalTexture;

        this._decal = new Decal(this.layerScene);
        this._decal.material = material;
    }

    private _updateDecalTexture(): void {
        const context = this._decalTexture.getContext();
        context.clearRect(0, 0, 512, 512);

        var gradient = context["createRadialGradient"](256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, "#48aff0");
        gradient.addColorStop(this._attenuation, "#48aff0");
        gradient.addColorStop(1, "#444444");

        context.fillStyle = gradient;

        if (this._brushData) {
            context["globalCompositeOperation"] = "destination-atop";
            context.putImageData(this._brushData, 0, 0);
        }

        context.beginPath();
        context.moveTo(0, 0);
        context.arc(256, 256, 256, 0, Math.PI * 2);
        context.closePath();
        context.fill();

        this._decalTexture.update(true, true);
    }

    /**
     * Updates the decal using the last picking info.
     */
    private _updateDecalWithLastPickInfo(): void {
        if (this._pick) {
            this._decal.updateDecal(this._pick);
        }
    }

    /**
     * Serializes the painting tool.
     */
    public serialize(): any {
        return {
            radius: this._size,
            strength: this._strength,
            brushData: this._brushData,
            brushAbsolutePath: this.brushAbsolutePath,
        };
    }

    /**
     * Parses the painting tool taking the given configuration.
     */
    public parse(config: any): void {
        this.size = config.radius;
        this.strength = config.strength;
        this.brushData = config.brushData;
        this.brushAbsolutePath = config.brushAbsolutePath;
    }
}
