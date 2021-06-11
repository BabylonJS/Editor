import { Nullable } from "../../../../shared/types";

import { PointerInfo, PickingInfo, Mesh, Material, Vector3, PointerEventTypes } from "babylonjs";

import { Editor } from "../../editor";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";

import { InspectorNotifier } from "../../gui/inspector/notifier";

import { PreviewCanvasEventType } from "../../components/preview";

import { Decal } from "../tools/decal";
import { AbstractPaintingTool } from "../abstract-tool";

export class DecalsPainter extends AbstractPaintingTool {
	/**
	 * Defines wether or not the created decals receive shadows or not.
	 */
	public receiveShadows: boolean = true;

	private _decal: Decal;
	private _lastPickingInfo: Nullable<PickingInfo> = null;

	/**
	 * Constructor.
	 * @param editor the editor reference.
	 */
	public constructor(editor: Editor) {
		super(editor);

		this._decal = new Decal(this.layerScene);
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
		if (info.type === PointerEventTypes.POINTERMOVE) {
			return this._updateDecal(false);
		}

		if (info.type === PointerEventTypes.POINTERWHEEL) {
			const event = info.event as WheelEvent;
			const delta = event.deltaY * -0.001;

			if (info.event.altKey) {
				return this._rotateDecal(delta);
			} else {
				return this._sizeDecal(delta);
			}
		}

		if (info.type === PointerEventTypes.POINTERUP) {
			return this._updateDecal(true);
		}
	}

	/**
	* Called on the Control key (or Command key) is released. This is the where
	* the painting tool should be removed here.
	*/
	protected onControlKeyReleased(): void {
		this._decal.disposeMesh();
	}

	/**
	 * Called on a canvas event is trigerred.
	 * @param event defines the canvas event type.
	 */
	protected onCanvasEvent(event: PreviewCanvasEventType): void {
		switch (event) {
			case PreviewCanvasEventType.Blurred:
				this._decal.disposeMesh();
				break;
		}
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
	* Sizes the current decal using the given delta.
	*/
	private _sizeDecal(delta: number): void {
		this._decal.size.addInPlace(new Vector3(delta, delta, delta));

		if (this._decal.size.x < 0) {
			this._decal.size.set(0, 0, 0);
		}

		this._updateDecalWithLastPickInfo();

		InspectorNotifier.NotifyChange(this, {
			caller: this,
			waitMs: 100,
		});
	}

	/**
	* Rotates the current decal using the given delta.
	*/
	private _rotateDecal(delta: number): void {
		this._decal.angle += delta;
		this._updateDecalWithLastPickInfo();

		InspectorNotifier.NotifyChange(this, {
			caller: this,
			waitMs: 100,
		});
	}

	/**
	 * Updates the decal.
	 */
	private _updateDecal(keepInScene: boolean): void {
		const scene = this.editor.scene!;

		this._lastPickingInfo = scene.pick(scene.pointerX, scene.pointerY, (n) => !n.metadata?.isDecal, false, scene.activeCamera);
		if (!this._lastPickingInfo) { return; }

		if (!keepInScene) {
			return this._decal.updateDecal(this._lastPickingInfo);
		}

		this._decal.disposeMesh();

		const clonedPickingInfo = this._lastPickingInfo;
		let decal: Nullable<Mesh> = null;

		undoRedo.push({
			common: () => this.editor.graph.refresh(),
			redo: () => {
				decal = this._decal.createDecal(clonedPickingInfo);
				if (decal) {
					decal.name = this.material?.name ?? "new decal";
					decal.isPickable = true;
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
		});
	}

	/**
	 * Updates the decal using the last picking info.
	 */
	private _updateDecalWithLastPickInfo(): void {
		if (this._lastPickingInfo) {
			this._decal.updateDecal(this._lastPickingInfo);
		}
	}

	/**
	 * Serializes the painting tool.
	 */
	public serialize(): any {
		return {
			materialId: this.material?.id ?? null,
			angle: this.angle,
			size: this.size,
			width: this.width,
			height: this.height,
			receiveShadows: this.receiveShadows,
		}
	}

	/**
	 * Parses the painting tool taking the given configuration.
	 */
	public parse(config: any): void {
		const material = config.materialId ? this.editor.scene!.getMaterialByID(config.materialId) : null;
		if (material) {
			this.material = material;
		}

		this.angle = config.angle;
		this.size = config.size;
		this.width = config.width;
		this.height = config.height;
		this.receiveShadows = config.receiveShadows;
	}
}
