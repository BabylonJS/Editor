import { Nullable } from "../../../shared/types";

import { Observer, PointerInfo, UtilityLayerRenderer } from "babylonjs";

import { Editor } from "../editor";

import { PreviewCanvasEventType } from "../components/preview";
import { SceneSettings } from "../scene/settings";

export abstract class AbstractPaintingTool {
	/**
	 * Defines the reference to the editor.
	 */
	protected editor: Editor;
	/**
	 * Defines the reference to the layer scene used ot render the painting tool.
	 */
	protected layerScene: UtilityLayerRenderer;

	private _pointerObserver: Nullable<Observer<PointerInfo>>;
    private _canvasEventObserver: Nullable<Observer<PreviewCanvasEventType>>;

	/**
	 * Constructor.
	 * @param editor the editor reference.
	 */
	public constructor(editor: Editor) {
		this.editor = editor;

		this.layerScene = new UtilityLayerRenderer(this.editor.scene!);
        this.layerScene.utilityLayerScene.postProcessesEnabled = false;
		this.layerScene.processAllEvents = true;

		this._pointerObserver = editor.scene!.onPointerObservable.add((infos) => this._processGlobalPointer(infos));
		this._canvasEventObserver = editor.preview.onCanvasEventObservable.add((event) => this.onCanvasEvent(event));
	}

	/**
	 * Disposes the painting tool. Will typically dispose the observers and
	 * utility layer scene(s).
	 */
	public dispose(): void {
		if (this._pointerObserver) { this.editor.scene!.onPointerObservable.remove(this._pointerObserver); }
        if (this._canvasEventObserver) { this.editor.preview.onCanvasEventObservable.remove(this._canvasEventObserver); }

		this.layerScene.dispose();
	}

	/**
	 * Called on a pointer event is trigerred.
	 */
	private _processGlobalPointer(info: PointerInfo): void {
		if (!SceneSettings.IsCameraLocked) {
			return this.onControlKeyReleased();
		}

		return this.onPointerEvent(info);
	}

	/**
	 * To be implemeneted.
	 * This function is called on a pointer event is trigerred on the main scene in the editor.
	 * @param info defines the reference to the pointer event informations.
	 */
	protected abstract onPointerEvent(info: PointerInfo): void;

	/**
	 * Called on the Control key (or Command key) is released. This is the where
	 * the painting tool should be removed here.
	 */
	protected onControlKeyReleased(): void {
		// Nothing to do here...
	}

	/**
	 * Called on a canvas event is trigerred.
	 * @param event defines the canvas event type.
	 */
	protected onCanvasEvent(_: PreviewCanvasEventType): void {
		// Nothing to do here...
	}
}
