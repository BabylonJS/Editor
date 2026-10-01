import { Color3, Matrix, Mesh, PointerEventTypes, PointerInfoPre, Ray, Scene, Vector3 } from "babylonjs";
import { toast } from "sonner";

import { Editor } from "../../../../main";

import { isDarwin } from "../../../../../tools/os";
import { isDomTextInputFocused } from "../../../../../tools/dom";

import { TerrainGrid } from "../../../../../tools/terrain/core/grid";
import { buildTerrainStrokeRequest, getActiveTerrainTool, getTerrainBrushRadiusRange, TERRAIN_PAINT_TOOLS } from "../../../../../tools/terrain/core/settings";
import { ITerrainBrushShape, ITerrainStrokeRequest, TerrainTool } from "../../../../../tools/terrain/core/types";
import { beginTerrainStroke, canBeginTerrainStroke, processActiveTerrainStroke } from "../../../../../tools/terrain/engine/editing";
import { getTerrainMeshInfo, getTerrainPlugin, pickTerrain } from "../../../../../tools/terrain/engine/info";
import { sampleTerrainSurface } from "../../../../../tools/terrain/engine/sampling";
import { isTerrainPaintTool } from "../../../../../tools/terrain/engine/stroke";
import { getTerrainMetric } from "../../../../../tools/terrain/engine/transform";
import { ITerrainPointerSample, ITerrainStrokeHandle } from "../../../../../tools/terrain/engine/types";
import { loadTerrainBrushShape } from "../../../../../tools/terrain/io/brushes";

import { getActiveTerrainLayerId, onTerrainSettingsChangedObservable, TerrainInspectorSculptTool, terrainSculptTools, terrainSettings, updateTerrainSettings } from "../settings";

import { TerrainBrushCursor } from "./cursor";

/** Colors of the cursor of the sculpt tools: [normal, inverted]. */
const sculptCursorColors: Record<TerrainInspectorSculptTool, [string, string]> = {
	raise: ["#ffffff", "#ff9a3c"],
	smooth: ["#56ccf2", "#56ccf2"],
	flatten: ["#ffd166", "#ffd166"],
	"set-height": ["#ffd166", "#ffd166"],
	ramp: ["#ffd166", "#ffd166"],
	noise: ["#8ecbff", "#8ecbff"],
	terrace: ["#ffd166", "#ffd166"],
	holes: ["#ff5a5f", "#7bd88f"],
};

/** Color of the cursor when a stroke can't start, and of the paint tool when it erases. */
const refusedColor = Color3.FromHexString("#7a7a7a");
const eraseColor = Color3.FromHexString("#ff9a3c");

/**
 * Handles the terrain tool in the preview: the cursor of the brush, the strokes drawn with the left button of the mouse, and the shortcuts.
 * Like for the decal tool, the objects of the preview can't be selected while the tool is opened.
 */
export class TerrainViewportController {
	/**
	 * In navigate mode, the left button of the mouse moves the camera instead of editing the terrain.
	 */
	public navigateMode: boolean = false;

	private _editor: Editor;
	private _onNavigateModeChanged: () => void;

	private _scene: Scene | null = null;
	private _target: Mesh | null = null;
	private _cursor: TerrainBrushCursor | null = null;
	private _frameId: number = -1;

	private _stroke: ITerrainStrokeHandle | null = null;
	private _shape: ITerrainBrushShape | null = null;
	private _shapeBrushId: string | null = null;

	/** Position of the pointer in the window while it is over the preview. */
	private _pointer: { x: number; y: number } | null = null;
	/** Last position of the cursor over the terrain. */
	private _lastPoint: Vector3 | null = null;
	private _shiftDown: boolean = false;
	private _lastWheelEvent: WheelEvent | null = null;

	private _removeListeners: (() => void)[] = [];
	private _removeSceneObservers: (() => void)[] = [];

	/**
	 * @param onNavigateModeChanged defines the function called when the navigate mode is toggled by its shortcut.
	 */
	public constructor(editor: Editor, onNavigateModeChanged: () => void) {
		this._editor = editor;
		this._onNavigateModeChanged = onNavigateModeChanged;

		editor.layout.preview.setState({ pickingEnabled: false });

		const canvas = editor.layout.preview.canvas!;
		this._listen(canvas, "pointerleave", () => (this._pointer = null));
		this._listen(canvas, "lostpointercapture", () => this._endStroke());
		this._listen(document, "keydown", (ev) => this._handleKeyDown(ev as KeyboardEvent));
		this._listen(document, "keyup", (ev) => (this._shiftDown = (ev as KeyboardEvent).shiftKey));

		const settingsObserver = onTerrainSettingsChangedObservable.add(() => this._handleSettingsChanged());
		this._removeListeners.push(() => onTerrainSettingsChangedObservable.remove(settingsObserver));

		this._loadBrushShape();
	}

	/**
	 * Sets the scene of the preview: it is created again when another scene or project is loaded.
	 */
	public setScene(scene: Scene): void {
		if (scene === this._scene) {
			return;
		}

		this._endStroke();
		this._removeSceneObservers.forEach((remove) => remove());
		this._cursor?.dispose();

		this._scene = scene;
		this._cursor = new TerrainBrushCursor(scene);

		const pointerObserver = scene.onPrePointerObservable.add((info) => this._handlePointer(info));
		const renderObserver = scene.onBeforeRenderObservable.add(() => this._handleFrame());

		this._removeSceneObservers = [() => scene.onPrePointerObservable.remove(pointerObserver), () => scene.onBeforeRenderObservable.remove(renderObserver)];
	}

	/**
	 * Sets the terrain edited by the tool, null when the edited object is not a terrain.
	 */
	public setTarget(mesh: Mesh | null): void {
		if (mesh === this._target) {
			return;
		}

		this._endStroke();
		this._target = mesh;
		this._lastPoint = null;

		if (!mesh) {
			return;
		}

		// The painted layers are loaded when the tool targets a terrain, and the radius of the brush fits the size of the terrain.
		getTerrainPlugin(mesh)?.whenWeightMapsReadyAsync();

		const range = getRadiusRange(mesh);
		const radius = Math.min(range.targetMax, Math.max(range.targetMin, terrainSettings.brush.radius));

		if (radius !== terrainSettings.brush.radius) {
			updateTerrainSettings((settings) => (settings.brush.radius = radius));
		}
	}

	public setNavigateMode(navigateMode: boolean): void {
		this._endStroke();
		this.navigateMode = navigateMode;
		this._onNavigateModeChanged();
	}

	/**
	 * Returns the height (world cm) of the terrain at the last position of the cursor over it, null when the cursor was never over it.
	 */
	public pickHeightUnderCursor(): number | null {
		const target = this._target;
		if (!target || !this._lastPoint || target.isDisposed()) {
			return null;
		}

		return sampleTerrainSurface(target, this._lastPoint.x, this._lastPoint.z)?.heightWorld ?? null;
	}

	public dispose(): void {
		this._endStroke();

		this._removeListeners.forEach((remove) => remove());
		this._removeSceneObservers.forEach((remove) => remove());
		this._cursor?.dispose();

		this._editor.layout.preview.setState({ pickingEnabled: true });
	}

	private _handlePointer(info: PointerInfoPre): void {
		const event = info.event as PointerEvent;

		this._pointer = { x: event.clientX, y: event.clientY };
		this._shiftDown = event.shiftKey;

		switch (info.type) {
			case PointerEventTypes.POINTERDOWN:
				// A press on the terrain never moves the camera: the right and middle buttons, and Alt, still do.
				if (event.button === 0 && !event.altKey && this._handlePointerDown(event)) {
					info.skipOnPointerObservable = true;
				}
				break;

			case PointerEventTypes.POINTERMOVE:
				if (this._stroke) {
					info.skipOnPointerObservable = true;
					this._stroke.addSample(this._createSample(event));
				}
				break;

			case PointerEventTypes.POINTERUP:
				if (this._stroke && event.button === 0) {
					info.skipOnPointerObservable = true;
					this._endStroke();
				}
				break;

			case PointerEventTypes.POINTERWHEEL:
				this._handleWheel(info, info.event as unknown as WheelEvent);
				break;
		}
	}

	/**
	 * Begins a stroke when the left button is pressed over the terrain. Returns true when the press is over the terrain.
	 */
	private _handlePointerDown(event: PointerEvent): boolean {
		const target = this._target;
		const tool = getActiveTerrainTool(terrainSettings);
		const ray = this._createRay(event.clientX, event.clientY);

		if (!target || !ray || this.navigateMode || this._stroke || !pickTerrain(this._scene, ray, { mesh: target, solidHoles: tool === "holes" })) {
			return false;
		}

		const request = this._createRequest(target, tool, terrainSettings.invertToggle !== event.shiftKey);
		const result = beginTerrainStroke(this._editor, target, request, this._createSample(event));

		if (result.handle) {
			this._stroke = result.handle;
			this._editor.layout.preview.canvas?.setPointerCapture(event.pointerId);
		} else {
			toast.warning(result.message, { id: "terrain-refusal" });
		}

		return true;
	}

	/**
	 * Cmd (macOS) or Ctrl + wheel changes the radius of the brush, with Shift its strength. The editor camera doesn't move while they are held.
	 */
	private _handleWheel(info: PointerInfoPre, event: WheelEvent): void {
		// Babylon notifies a wheel event once per axis that moved.
		if (!this._target || event === this._lastWheelEvent || !(isDarwin() ? event.metaKey : event.ctrlKey)) {
			return;
		}

		this._lastWheelEvent = event;

		info.skipOnPointerObservable = true;
		event.preventDefault();

		// macOS turns Shift + wheel into a horizontal scroll. A notch of a mouse wheel is 100 px.
		const notches = -(event.deltaY || event.deltaX) / 100;

		if (event.shiftKey) {
			this._addStrength(notches * 0.05);
		} else {
			this._multiplyRadius(Math.pow(1.1, notches));
		}
	}

	private _handleKeyDown(event: KeyboardEvent): void {
		this._shiftDown = event.shiftKey;

		// The shortcuts work while the pointer is over the preview. Only the brackets repeat while they are held.
		if (!this._pointer || !this._target || event.ctrlKey || event.metaKey || event.altKey || isDomTextInputFocused() || (event.repeat && !event.code.startsWith("Bracket"))) {
			return;
		}

		const tool = getActiveTerrainTool(terrainSettings);

		switch (event.code) {
			case "BracketLeft":
				return event.shiftKey ? this._addStrength(-0.05) : this._multiplyRadius(0.8);

			case "BracketRight":
				return event.shiftKey ? this._addStrength(0.05) : this._multiplyRadius(1.25);

			case "KeyX":
				return updateTerrainSettings((settings) => (settings.invertToggle = !settings.invertToggle));

			case "KeyN":
				return this.setNavigateMode(!this.navigateMode);

			// Picks the height of the flatten and set height tools under the cursor.
			case "KeyI": {
				const height = this.pickHeightUnderCursor();
				if (height !== null && (tool === "flatten" || tool === "set-height")) {
					updateTerrainSettings((settings) => (settings.sculpt[tool === "flatten" ? "flatten" : "setHeight"].heightWorld = Math.round(height * 10) / 10));
				}
				return;
			}

			// Cancels the stroke being drawn: the terrain gets back its heights or its painted layers.
			case "Escape":
				this._stroke?.cancel();
				this._stroke = null;
				return;
		}

		// The digits select the tools of the mode, in the order of the list: Digit1 is the first one, Digit0 the tenth one.
		const digit = /^Digit([0-9])$/.exec(event.code);
		const index = digit ? (parseInt(digit[1]) + 9) % 10 : -1;

		if (isTerrainPaintTool(tool) && TERRAIN_PAINT_TOOLS[index]) {
			updateTerrainSettings((settings) => (settings.paintTool = TERRAIN_PAINT_TOOLS[index]));
		} else if (!isTerrainPaintTool(tool) && terrainSculptTools[index]) {
			updateTerrainSettings((settings) => (settings.sculptTool = terrainSculptTools[index]));
		}
	}

	private _handleSettingsChanged(): void {
		// A switch of mode or tool ends the stroke.
		if (this._stroke && getActiveTerrainTool(terrainSettings) !== this._stroke.tool) {
			this._endStroke();
		}

		if (terrainSettings.brush.brushId !== this._shapeBrushId) {
			this._loadBrushShape();
		}
	}

	private _handleFrame(): void {
		// Once per frame: the preview of a camera renders the scene a second time.
		const frameId = this._scene!.getEngine().frameId;
		if (frameId === this._frameId) {
			return;
		}

		this._frameId = frameId;

		// The stroke being drawn is processed at each frame, in a time budget.
		processActiveTerrainStroke(this._editor);

		// Ended elsewhere: undo, save, play...
		if (this._stroke && !this._stroke.isActive) {
			this._stroke = null;
		}

		this._updateCursor();
	}

	private _updateCursor(): void {
		const target = this._target;
		const tool = getActiveTerrainTool(terrainSettings);
		const ray = this._pointer && this._createRay(this._pointer.x, this._pointer.y);
		const hover = target && ray && !this.navigateMode ? pickTerrain(this._scene, ray, { mesh: target, solidHoles: tool === "holes" }) : null;

		if (!target || !hover) {
			this._cursor?.update(null);
			return;
		}

		this._lastPoint = hover.worldPoint.clone();

		const preview = this._stroke?.preview;
		const invert = terrainSettings.invertToggle !== this._shiftDown;

		// The cursor is grey when a stroke can't start: hidden terrain, running operation...
		const refused = !this._stroke && canBeginTerrainStroke(this._editor, target, this._createRequest(target, tool, invert)) !== null;

		this._cursor?.update({
			// With stroke smoothing, the brush follows the pointer with a delay.
			center: preview?.lazyCenter ?? hover.worldPoint,
			radius: terrainSettings.brush.radius,
			hardness: terrainSettings.brush.hardness,
			color: refused ? refusedColor : this._getCursorColor(target, tool, invert),
			sampleHeight: (x, z) => sampleTerrainSurface(target, x, z)?.heightWorld ?? null,
			targetHeight: preview?.targetHeightWorld ?? this._getTargetHeight(tool, hover.worldPoint),
			ramp: preview?.rampStart && preview.rampEnd ? { start: preview.rampStart, end: preview.rampEnd } : null,
		});
	}

	/**
	 * Returns the height reached by the flatten and set height tools, shown by a disc under the cursor.
	 */
	private _getTargetHeight(tool: TerrainTool, point: Vector3): number | null {
		const sculpt = terrainSettings.sculpt;

		switch (tool) {
			case "set-height":
				return sculpt.setHeight.heightWorld;

			case "flatten":
				return sculpt.flatten.target === "fixed" ? sculpt.flatten.heightWorld : sculpt.flatten.target === "stroke-start" ? point.y : null;

			default:
				return null;
		}
	}

	private _getCursorColor(target: Mesh, tool: TerrainTool, invert: boolean): Color3 {
		switch (tool) {
			case "blend":
				return Color3.White();

			// The paint tools show the tint of the painted layer.
			case "paint":
			case "replace": {
				if (tool === "paint" && invert) {
					return eraseColor;
				}

				const layerId = getActiveTerrainLayerId(target.material);
				const tint = getTerrainPlugin(target)?.data.layers.find((layer) => layer.id === layerId)?.tint;

				return tint ? new Color3(tint[0], tint[1], tint[2]) : Color3.White();
			}

			default:
				return Color3.FromHexString(sculptCursorColors[tool as TerrainInspectorSculptTool][invert ? 1 : 0]);
		}
	}

	private _createRequest(target: Mesh, tool: TerrainTool, invert: boolean): ITerrainStrokeRequest {
		const brush = terrainSettings.brush;

		// The falloff and the hardness of the brush don't need to load its image again.
		const shape: ITerrainBrushShape = {
			...(this._shape ?? { id: "builtin:round", kind: "round", mask: null }),
			falloff: brush.falloff,
			hardness: brush.hardness,
			edgeFalloff: brush.edgeFalloff,
		};

		const layerId = isTerrainPaintTool(tool) ? getActiveTerrainLayerId(target.material) : null;

		return buildTerrainStrokeRequest(terrainSettings, shape, layerId, invert, Math.floor(Math.random() * 0x7fffffff));
	}

	private _createSample(event: PointerEvent): ITerrainPointerSample {
		return {
			ray: this._createRay(event.clientX, event.clientY)!,
			timeMs: event.timeStamp || performance.now(),
			invert: terrainSettings.invertToggle !== event.shiftKey,
		};
	}

	/**
	 * Returns the ray of the camera of the preview through the given position in the window.
	 */
	private _createRay(clientX: number, clientY: number): Ray | null {
		const preview = this._editor.layout.preview;
		const camera = preview.scene.activeCamera;
		const rect = preview.canvas!.getBoundingClientRect();

		return camera ? preview.scene.createPickingRay(clientX - rect.left, clientY - rect.top, Matrix.Identity(), camera) : null;
	}

	private _multiplyRadius(factor: number): void {
		const range = getRadiusRange(this._target!);

		updateTerrainSettings((settings) => (settings.brush.radius = Math.min(range.max, Math.max(range.min, Math.round(settings.brush.radius * factor * 100) / 100))));
	}

	private _addStrength(delta: number): void {
		const tool = getActiveTerrainTool(terrainSettings);
		updateTerrainSettings((settings) => (settings.strength[tool] = Math.min(1, Math.max(0, Math.round((settings.strength[tool] + delta) * 100) / 100))));
	}

	/**
	 * Loads the shape of the selected brush: the image of the brush is read asynchronously.
	 */
	private _loadBrushShape(): void {
		const brushId = terrainSettings.brush.brushId;
		this._shapeBrushId = brushId;

		loadTerrainBrushShape(brushId, terrainSettings.brush).then((shape) => {
			// Another brush may have been selected meanwhile.
			if (brushId === this._shapeBrushId) {
				this._shape = shape;
			}
		});
	}

	/**
	 * Ends the stroke being drawn: one undo/redo.
	 */
	private _endStroke(): void {
		if (this._stroke?.isActive) {
			this._stroke.end();
		}

		this._stroke = null;
	}

	private _listen(target: EventTarget, type: string, listener: (event: Event) => void): void {
		target.addEventListener(type, listener);
		this._removeListeners.push(() => target.removeEventListener(type, listener));
	}
}

function getRadiusRange(mesh: Mesh): ReturnType<typeof getTerrainBrushRadiusRange> {
	const info = getTerrainMeshInfo(mesh);
	return getTerrainBrushRadiusRange(new TerrainGrid(info.subdivisions, info.width, info.height), getTerrainMetric(mesh));
}
