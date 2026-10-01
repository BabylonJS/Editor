import {
	Color3,
	Matrix,
	PointerEventTypes,
	PointerInput,
	Vector3,
	type AbstractEngine,
	type Mesh,
	type Nullable,
	type Observer,
	type PointerInfoPre,
	type Ray,
	type Scene,
} from "babylonjs";
import { toast } from "sonner";

import type { Editor } from "../../../../main";
import type { EditorPreview } from "../../../preview";

import { isDarwin } from "../../../../../tools/os";
import { isNode } from "../../../../../tools/guards/nodes";
import { isSprite } from "../../../../../tools/guards/sprites";

import { buildTerrainStrokeRequest, getActiveTerrainTool, getTerrainBrushRadiusRange, TERRAIN_PAINT_TOOLS } from "../../../../../tools/terrain/core/settings";
import type { ITerrainBrushShape, ITerrainGrid, ITerrainMetric, ITerrainStrokeRequest, TerrainSculptTool, TerrainTool } from "../../../../../tools/terrain/core/types";
import { beginTerrainStroke, canBeginTerrainStroke, processActiveTerrainStroke } from "../../../../../tools/terrain/engine/editing";
import { getTerrainEligibility } from "../../../../../tools/terrain/engine/eligibility";
import { onTerrainChangedObservable } from "../../../../../tools/terrain/engine/events";
import { getTerrainMeshInfo, getTerrainPlugin, pickTerrain } from "../../../../../tools/terrain/engine/info";
import { evaluateTerrainFootprint, getTerrainHeightPatch, sampleTerrainLayerWeights, sampleTerrainSurface } from "../../../../../tools/terrain/engine/sampling";
import { onActiveTerrainStrokeChangedObservable } from "../../../../../tools/terrain/engine/state";
import {
	TERRAIN_REFUSAL_MESSAGES,
	type ITerrainBeginStrokeResult,
	type ITerrainFootprint,
	type ITerrainPick,
	type ITerrainPointerSample,
	type ITerrainStrokeHandle,
	type ITerrainSurfaceSample,
	type TerrainEligibility,
	type TerrainStrokeRefusal,
} from "../../../../../tools/terrain/engine/types";
import { onTerrainBusyChangedObservable } from "../../../../../tools/terrain/engine/yield";
import { TerrainBrushLibrary } from "../../../../../tools/terrain/io/brush-library";

import {
	getActiveTerrainLayerId,
	getTerrainSettingsRevision,
	onTerrainSettingsChangedObservable,
	setActiveTerrainLayerId,
	terrainSettings,
	updateTerrainSettings,
} from "../settings";

import { TerrainBrushCursor, type ITerrainBrushCursorFrame } from "./cursor";
import { formatTerrainHudLength, formatTerrainHudLine, formatTerrainHudPercent, TerrainHud, TERRAIN_TOOL_LABELS } from "./hud";
import {
	getNextTerrainOverlay,
	getTerrainCameraKeyCodes,
	getTerrainShortcutAction,
	isTerrainShortcutContext,
	isTerrainTextInputElement,
	loadTerrainKeyboardLayout,
	type ITerrainCameraKeys,
	type TerrainShortcutAction,
} from "./shortcuts";

export interface ITerrainViewportStatus {
	canEdit: boolean;
	/** Hint shown under the tool row (refusal or state message), null when none. */
	message: string | null;
	hover: ITerrainPick | null;
	strokeActive: boolean;
	navigateMode: boolean;
	/** true while a brush capture is armed (§1.9). */
	captureArmed: boolean;
	/** Refusal a stroke would get at the hover point (the cursor is greyed), null when a stroke would start. */
	predictedRefusal: TerrainStrokeRefusal | null;
}

export interface ITerrainViewportControllerOptions {
	/** Root element of the tab (visibility guard, shortcut scope). */
	rootElement: HTMLElement | null;
	onStatusChanged?: (status: Readonly<ITerrainViewportStatus>) => void;
}

/** Refusal texts of §1.17 (hint line and HUD): the engine's texts. */
export const TERRAIN_VIEWPORT_REFUSAL_MESSAGES: Readonly<Record<TerrainStrokeRefusal, string>> = TERRAIN_REFUSAL_MESSAGES;

/** Hint and HUD text while a brush capture is armed (§1.9). */
export const TERRAIN_CAPTURE_HINT = "Click on the terrain to capture a brush · Esc to cancel";

/** Cursor colours of the sculpt tools (§1.6): [normal, inverted]. */
export const TERRAIN_SCULPT_CURSOR_COLORS: Readonly<Record<TerrainSculptTool, readonly [string, string]>> = {
	raise: ["#ffffff", "#ff9a3c"],
	smooth: ["#56ccf2", "#56ccf2"],
	flatten: ["#ffd166", "#ffd166"],
	"set-height": ["#ffd166", "#ffd166"],
	ramp: ["#ffd166", "#ffd166"],
	noise: ["#8ecbff", "#8ecbff"],
	terrace: ["#ffd166", "#ffd166"],
	erode: ["#8ecbff", "#8ecbff"],
	stamp: ["#ffffff", "#ff9a3c"],
	holes: ["#ff5a5f", "#7bd88f"],
};

/** Paint ring colour while erasing. */
export const TERRAIN_ERASE_CURSOR_COLOR = "#ff9a3c";

/** A press released within this distance (CSS px) on another eligible terrain selects it. */
export const TERRAIN_CLICK_SELECT_DISTANCE_PX = 3;
/** Radius factor per wheel notch (Cmd/Ctrl + wheel). */
export const TERRAIN_WHEEL_RADIUS_FACTOR = 1.1;
/** Strength step per wheel notch (Cmd/Ctrl + Shift + wheel). */
export const TERRAIN_WHEEL_STRENGTH_STEP = 0.05;
/** Radial adjust: radius = radius₀ × exp((x − x₀) / 200), strength = strength₀ − (y − y₀) / 300 (CSS px). */
export const TERRAIN_RADIAL_RADIUS_PX = 200;
export const TERRAIN_RADIAL_STRENGTH_PX = 300;

/** Grid size of the footprint preview (§4.15). */
const TERRAIN_FOOTPRINT_GRID_SIZE = 33;
/** Resolution of a captured brush (§4.16). */
const TERRAIN_CAPTURE_RESOLUTION = 256;
/** How long the refusal of a press stays in the hint line (ms). */
const TERRAIN_PRESS_REFUSAL_HINT_MS = 3000;
/** Same error message reported at most once per this delay (console and toast). */
const TERRAIN_ERROR_DEDUPE_MS = 5000;
/** Wheel events with a smaller |delta| (trackpads, smooth scrolling) change a value at most once per TERRAIN_WHEEL_SMALL_DELTA_INTERVAL_MS. */
const TERRAIN_WHEEL_SMALL_DELTA = 40;
const TERRAIN_WHEEL_SMALL_DELTA_INTERVAL_MS = 40;
/** Pixels of a wheel notch (Chromium, pixel delta mode) and maximum notches taken from one event. */
const TERRAIN_WHEEL_NOTCH_PIXELS = 100;
const TERRAIN_WHEEL_MAX_NOTCHES = 5;
/** Pre-pointer events handled by the controller. */
const TERRAIN_POINTER_MASK = PointerEventTypes.POINTERDOWN | PointerEventTypes.POINTERMOVE | PointerEventTypes.POINTERUP | PointerEventTypes.POINTERWHEEL;
/** Pen eraser: PointerEvent.button of an eraser contact and the buttons bit of the eraser. */
const TERRAIN_PEN_ERASER_BUTTON = 5;
const TERRAIN_PEN_ERASER_BUTTONS = 32;
/** Radius bounds when the target is not a terrain (same as the settings merge). */
const TERRAIN_RADIUS_FALLBACK_RANGE = { min: 0.01, max: 100000 };
/** PointerEvent.buttons bits of RMB (2) and MMB (4): an LMB press chorded with them belongs to the navigating camera. */
const TERRAIN_NAVIGATION_BUTTONS = 6;

/** Fields of the DOM pointer and wheel events read by the controller (PointerEvent / WheelEvent satisfy it; Babylon adds inputIndex). */
interface ITerrainPointerEventLike {
	readonly clientX: number;
	readonly clientY: number;
	readonly button?: number;
	readonly buttons?: number;
	readonly altKey?: boolean;
	readonly shiftKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly metaKey?: boolean;
	readonly isPrimary?: boolean;
	readonly pointerId?: number;
	readonly pointerType?: string;
	readonly pressure?: number;
	readonly timeStamp?: number;
	readonly inputIndex?: number;
	readonly deltaX?: number;
	readonly deltaY?: number;
	getCoalescedEvents?(): ITerrainPointerEventLike[];
	preventDefault?(): void;
}

interface ITerrainViewportStroke {
	handle: ITerrainStrokeHandle;
	pointerId: number;
	/** PointerEvent.button that began the stroke (0: LMB, pen tip or touch; 5: pen eraser): only its release ends the stroke (§1.15). */
	button: number;
	tool: TerrainTool;
	/** Previous local hover point (x, z) of the stroke, for the stroke heading (Follow stroke direction). */
	lastLocal: { x: number; z: number } | null;
	heading: number;
}

interface ITerrainRadialAdjust {
	tool: TerrainTool;
	radius0: number;
	strength0: number;
	x0: number | null;
	y0: number | null;
	radius: number;
	strength: number;
	min: number;
	max: number;
	anchor: Vector3 | null;
}

interface ITerrainClickCandidate {
	mesh: Mesh;
	x: number;
	y: number;
	pointerId: number;
}

interface ITerrainRadiusRange {
	min: number;
	max: number;
	targetMin: number;
	targetMax: number;
}

interface ITerrainPickResult {
	target: ITerrainPick | null;
	other: ITerrainPick | null;
}

interface ITerrainListenerBinding {
	target: EventTarget;
	type: string;
	listener: EventListener;
}

const reportedTerrainViewportErrors: Map<string, number> = new Map<string, number>();

/**
 * Pointer, keyboard, cursor and HUD handling of the Terrain tab on the preview (§1.14, §1.15): target-first picking, strokes through the
 * terrain engine, Cmd/Ctrl + wheel, pen pressure and eraser, eyedropper, click-select of other terrains, Navigate mode, radial adjust,
 * brush capture; the picking, the gizmo and the scene icons of the preview are disabled while the tab is mounted and visible.
 * Every observer and listener body is wrapped in try/catch (§1.2): errors go to the editor console and a deduplicated toast.
 */
export class TerrainViewportController {
	private static readonly _liveControllers: Set<TerrainViewportController> = new Set<TerrainViewportController>();

	private readonly _editor: Editor;
	private readonly _options: ITerrainViewportControllerOptions;
	private readonly _isMac: boolean;

	private _disposed: boolean = false;
	private _target: Mesh | null = null;
	private _navigateMode: boolean = false;
	private _captureArmed: boolean = false;

	private _scene: Scene | null = null;
	private _prePointerObserver: Nullable<Observer<PointerInfoPre>> = null;
	private _beforeRenderObserver: Nullable<Observer<Scene>> = null;
	private _lastFrameId: number = -1;

	private _engine: AbstractEngine | null = null;
	private _beginFrameObserver: Nullable<Observer<AbstractEngine>> = null;
	/** tabActive() (§1.15) and visibility of the tab root at the last engine frame. */
	private _wasTabActive: boolean = true;
	private _wasRootVisible: boolean = true;

	private _cursor: TerrainBrushCursor | null = null;
	private _hud: TerrainHud | null = null;
	private _hudContainer: HTMLElement | null = null;
	private _canvas: HTMLCanvasElement | null = null;

	private readonly _unsubscribers: (() => void)[] = [];
	private _documentListeners: ITerrainListenerBinding[] = [];
	private _canvasListeners: ITerrainListenerBinding[] = [];

	private _pickingDisabled: boolean = false;
	private _gizmoHidden: boolean = false;
	private _iconsHidden: boolean = false;
	private _iconsWereEnabled: boolean = false;
	private _iconsStopPending: boolean = false;

	private _stroke: ITerrainViewportStroke | null = null;
	/** true while beginTerrainStroke runs: the engine already reports our stroke as active ("busy") before it returns. */
	private _beginningStroke: boolean = false;
	private _consumedPointerId: number | null = null;
	private _radial: ITerrainRadialAdjust | null = null;
	private _clickCandidate: ITerrainClickCandidate | null = null;
	private _pressRefusal: { refusal: TerrainStrokeRefusal | null; message: string; timeMs: number } | null = null;
	private _predictedRefusal: TerrainStrokeRefusal | null = null;

	private _pointer: { x: number; y: number } | null = null;
	private _pointerOverCanvas: boolean = false;
	private _navigationButtonsDown: boolean = false;
	private _shiftDown: boolean = false;
	private _controlDown: boolean = false;

	private _hover: ITerrainPick | null = null;
	private _hoverSurface: ITerrainSurfaceSample | null = null;
	private _hoverDirty: boolean = true;
	private _hoverVersion: number = -1;
	private _hoverCameraKey: string = "";
	private _lastTargetPoint: Vector3 | null = null;
	private _lastTargetPointMesh: Mesh | null = null;

	private _terrainVersion: number = 0;
	private _radiusRangeCache: { mesh: Mesh; range: ITerrainRadiusRange | null } | null = null;
	/** Whether the target was a terrain at its last target or structure change (the radius is clamped when it becomes one in place). */
	private _targetIsTerrain: boolean = false;

	private _shape: ITerrainBrushShape | null = null;
	private _shapeBrushId: string | null = null;
	private _shapeGeneration: number = 0;

	private _previewRequest: { key: string; shape: ITerrainBrushShape; request: ITerrainStrokeRequest } | null = null;
	private _footprintCache: { key: string; request: ITerrainStrokeRequest; footprint: ITerrainFootprint | null } | null = null;

	private _lastWheelEvent: unknown = null;
	private _lastSmallWheelStepMs: number = -Infinity;

	private _lastStatus: ITerrainViewportStatus;

	/** Disposes every live controller (used by the tab's error boundary, §1.2). */
	public static disposeAll(): void {
		for (const controller of Array.from(TerrainViewportController._liveControllers)) {
			controller.dispose();
		}
	}

	/**
	 * Constructor: disables the picking, the gizmo and the scene icons (view settings) of the preview when the tab is visible, registers
	 * the pre-pointer and frame observers, the keyboard listeners, the cursor and the HUD.
	 * @param editor defines the reference to the editor.
	 * @param options defines the tab root element and the callbacks.
	 */
	public constructor(editor: Editor, options: ITerrainViewportControllerOptions) {
		this._editor = editor;
		this._options = options;
		this._isMac = isDarwin();
		this._lastStatus = this._computeStatus();

		TerrainViewportController._liveControllers.add(this);

		this._safe(() => {
			void loadTerrainKeyboardLayout();
		});

		this._safe(() => this._subscribe());
		this._safe(() => this._bindDocument());
		this._safe(() => this._bindPreview());
		this._safe(() => this._bindScene(this._getPreview()?.scene ?? null));
		this._safe(() => this._resolveBrushShape(true));
		this._safe(() => this._updateStatus());
	}

	/**
	 * Follows the scene of the preview, created again when another scene or project is opened (the Terrain tab polls it): the stroke being
	 * drawn is committed (§7.3), the pointer and frame observers are bound to the new scene and a target of the old scene is dropped.
	 * @param scene defines the new scene of the preview.
	 */
	public setScene(scene: Scene | null): void {
		if (this._disposed || scene === this._scene) {
			return;
		}

		this._safe(() => this._endStroke());
		this._safe(() => this._bindScene(scene));

		if (this._target && (this._target.isDisposed() || this._target.getScene() !== scene)) {
			this.setTarget(null);
		}

		this._safe(() => this._updateStatus());
	}

	/** Also clamps the brush radius into getTerrainBrushRadiusRange(...).targetMin..targetMax of the new target (updateTerrainSettings). */
	public setTarget(mesh: Mesh | null): void {
		// Only a live mesh of the edit scene can be the target: a terrain of the Play scene (or a disposed mesh) means no target.
		if (mesh && (mesh.isDisposed() || (this._scene && mesh.getScene() !== this._scene))) {
			mesh = null;
		}

		if (this._disposed || mesh === this._target) {
			return;
		}

		this._safe(() => {
			// Implicit commit (§7.3): the stroke belongs to the previous target.
			this._endStroke();
			this._cancelRadialAdjust();

			this._captureArmed = false;
			this._clickCandidate = null;
			this._pressRefusal = null;

			this._target = mesh;
			this._setHover(null);
			this._lastTargetPoint = null;
			this._lastTargetPointMesh = null;

			this._radiusRangeCache = null;
			this._previewRequest = null;
			this._footprintCache = null;
			this._hoverDirty = true;

			this._targetIsTerrain = this._isTargetTerrain();
			this._clampRadiusToTarget();
			this._loadTargetWeights();
			this._updateStatus();
			this._updateHud();
		});
	}

	public get target(): Mesh | null {
		return this._target;
	}

	public get status(): Readonly<ITerrainViewportStatus> {
		return this._computeStatus();
	}

	public get navigateMode(): boolean {
		return this._navigateMode;
	}

	public setNavigateMode(enabled: boolean): void {
		if (this._disposed || enabled === this._navigateMode) {
			return;
		}

		this._safe(() => {
			if (enabled) {
				this._endStroke();
			}

			this._navigateMode = enabled;
			this._clickCandidate = null;
			this._updateStatus();
			this._updateHud();
		});
	}

	/** Arms a one-shot brush capture: the next LMB click on the target captures the footprint (getTerrainHeightPatch + TerrainBrushLibrary.addCapturedBrush), selects the new brush; Escape cancels. */
	public startBrushCapture(): void {
		if (this._disposed) {
			return;
		}

		this._safe(() => {
			this._captureArmed = true;
			this._updateStatus();
			this._updateHud();
		});
	}

	/** World height under the cursor (eyedropper buttons), null when not over the target. */
	public pickHeightUnderCursor(): number | null {
		try {
			const target = this._target;
			const point = this._lastTargetPoint;

			if (!target || !point || this._lastTargetPointMesh !== target || target.isDisposed()) {
				return null;
			}

			return sampleTerrainSurface(target, point.x, point.z)?.heightWorld ?? null;
		} catch (e) {
			this._reportError(e);
			return null;
		}
	}

	/** Dominant layer id under the cursor (argmax of sampleTerrainLayerWeights), null when unavailable. */
	public pickLayerUnderCursor(): string | null {
		try {
			const target = this._target;
			const point = this._lastTargetPoint;

			if (!target || !point || this._lastTargetPointMesh !== target || target.isDisposed()) {
				return null;
			}

			return this._getDominantLayerId(target, point);
		} catch (e) {
			this._reportError(e);
			return null;
		}
	}

	/** Re-resolves the brush shape (library change, brush selection, falloff/hardness change). */
	public refreshBrushShape(): void {
		if (this._disposed) {
			return;
		}

		this._safe(() => this._resolveBrushShape(true));
	}

	/** Commits any stroke, removes observers/listeners/cursor/HUD and enables the picking, the gizmo and the icons of the preview back. */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		// Disposed first: the tab is unmounting, no status is reported anymore.
		this._disposed = true;
		TerrainViewportController._liveControllers.delete(this);

		this._safe(() => this._endStroke());
		this._radial = null;

		this._captureArmed = false;
		this._clickCandidate = null;
		++this._shapeGeneration;

		this._safe(() => this._unbindScene());
		this._safe(() => this._unbindCanvas());
		this._safe(() => this._removeListeners(this._documentListeners));
		this._documentListeners = [];

		for (const unsubscribe of this._unsubscribers.splice(0)) {
			this._safe(unsubscribe);
		}

		this._safe(() => this._hud?.dispose());
		this._hud = null;
		this._hudContainer = null;

		this._safe(() => this._releasePreviewHelpers());
	}

	// Setup and teardown.

	private _subscribe(): void {
		const settingsObserver = onTerrainSettingsChangedObservable.add(() => this._safe(() => this._onSettingsChanged()));
		this._unsubscribers.push(() => onTerrainSettingsChangedObservable.remove(settingsObserver));

		const terrainObserver = onTerrainChangedObservable.add((event) =>
			this._safe(() => {
				if (event.mesh !== this._target) {
					return;
				}

				++this._terrainVersion;
				this._hoverDirty = true;

				if (event.kinds.includes("grid") || event.kinds.includes("node")) {
					this._onTargetStructureChanged(event.kinds.includes("grid"));
				}

				if (event.kinds.includes("material") || event.kinds.includes("layers")) {
					this._previewRequest = null;
				}

				this._updateStatus();
			})
		);
		this._unsubscribers.push(() => onTerrainChangedObservable.remove(terrainObserver));

		const strokeObserver = onActiveTerrainStrokeChangedObservable.add((handle) =>
			this._safe(() => {
				// A stroke ended elsewhere (undo) releases the pointer capture here.
				if (this._stroke && handle !== this._stroke.handle && !this._stroke.handle.isActive) {
					this._releaseStroke();
				}

				this._updateStatus();
			})
		);
		this._unsubscribers.push(() => onActiveTerrainStrokeChangedObservable.remove(strokeObserver));

		const busyObserver = onTerrainBusyChangedObservable.add(() => this._safe(() => this._updateStatus()));
		this._unsubscribers.push(() => onTerrainBusyChangedObservable.remove(busyObserver));

		try {
			const library = TerrainBrushLibrary.Get();
			const libraryObserver = library.onChangedObservable.add(() => this._safe(() => this._resolveBrushShape(true)));
			this._unsubscribers.push(() => library.onChangedObservable.remove(libraryObserver));
		} catch (e) {
			// No brush library (yet): shapes fall back to the round brush.
		}
	}

	private _bindDocument(): void {
		const ownerDocument = this._getDocument();
		if (!ownerDocument) {
			return;
		}

		this._addListener(this._documentListeners, ownerDocument, "keydown", (event) => this._onKeyDown(event as KeyboardEvent));
		this._addListener(this._documentListeners, ownerDocument, "keyup", (event) => this._onKeyUp(event as KeyboardEvent));

		const view = ownerDocument.defaultView;
		if (view) {
			this._addListener(this._documentListeners, view, "blur", () => this._onWindowBlur());
		}
	}

	private _bindPreview(): void {
		// Picking, gizmo and icons: disabled only while the tab is visible (a tab mounted hidden disables them when it shows).
		this._applyPreviewHelpers();
	}

	private _bindScene(scene: Scene | null): void {
		this._unbindScene();

		if (!scene || scene.isDisposed) {
			return;
		}

		this._scene = scene;
		this._lastFrameId = -1;

		this._prePointerObserver = scene.onPrePointerObservable.add((pointerInfo) => this._onPrePointer(pointerInfo), TERRAIN_POINTER_MASK);
		this._beforeRenderObserver = scene.onBeforeRenderObservable.add(() => this._onFrame());

		// Every engine frame, also while the edit scene isn't rendered (Play, save, export and loading dialogs).
		this._engine = scene.getEngine();
		this._beginFrameObserver = this._engine.onBeginFrameObservable.add(() => this._onEngineFrame());

		this._safe(() => {
			this._cursor = new TerrainBrushCursor(scene);
		});

		const preview = this._getPreview();
		this._safe(() => this._bindCanvas(preview?.canvas ?? null));

		// The preview reset restarts the icons: hide them again.
		this._iconsStopPending = true;
		this._safe(() => this._applyPreviewHelpers());
	}

	private _unbindScene(): void {
		const scene = this._scene;

		if (scene) {
			if (this._prePointerObserver) {
				scene.onPrePointerObservable.remove(this._prePointerObserver);
			}

			if (this._beforeRenderObserver) {
				scene.onBeforeRenderObservable.remove(this._beforeRenderObserver);
			}
		}

		if (this._engine && this._beginFrameObserver) {
			this._engine.onBeginFrameObservable.remove(this._beginFrameObserver);
		}

		this._prePointerObserver = null;
		this._beforeRenderObserver = null;
		this._scene = null;

		this._beginFrameObserver = null;
		this._engine = null;

		this._cursor?.dispose();
		this._cursor = null;
	}

	private _bindCanvas(canvas: HTMLCanvasElement | null): void {
		if (canvas === this._canvas) {
			return;
		}

		this._unbindCanvas();

		this._canvas = canvas;
		if (!canvas) {
			return;
		}

		this._addListener(this._canvasListeners, canvas, "pointerenter", () => this._onCanvasPointerEnter());
		this._addListener(this._canvasListeners, canvas, "pointerleave", () => this._onCanvasPointerLeave());
		this._addListener(this._canvasListeners, canvas, "pointerdown", (event) => this._onCanvasPointerDown(event as PointerEvent));
		this._addListener(this._canvasListeners, canvas, "pointerup", (event) => this._onCanvasPointerEnd(event as PointerEvent));
		this._addListener(this._canvasListeners, canvas, "pointercancel", (event) => this._onCanvasPointerEnd(event as PointerEvent));
		this._addListener(this._canvasListeners, canvas, "lostpointercapture", (event) => this._onCanvasPointerEnd(event as PointerEvent));

		const container = canvas.parentElement ?? null;
		if (container !== this._hudContainer || !this._hud) {
			this._hud?.dispose();
			this._hud = new TerrainHud(container);
			this._hudContainer = container;
		}
	}

	private _unbindCanvas(): void {
		this._removeListeners(this._canvasListeners);
		this._canvasListeners = [];
		this._canvas = null;
	}

	/**
	 * Disables the picking of the preview (like the Decal tab) and hides the gizmo and the scene icons (view settings) while the tab root is
	 * visible: a tab that flexlayout hides while it stays mounted (maximized Preview tabset, NavMesh or Ragdoll editor tab selected over the
	 * Inspector) leaves the viewport as it is without the tab; they are disabled again when it shows. Called at every frame: a selection made
	 * meanwhile attaches the gizmo again.
	 */
	private _applyPreviewHelpers(): void {
		const preview = this._getPreview();
		if (!preview || this._disposed) {
			return;
		}

		const visible = this._isRootVisible();
		const view = terrainSettings.view;

		if (visible !== this._pickingDisabled) {
			this._pickingDisabled = visible;
			preview.setState({ pickingEnabled: !visible });
		}

		const gizmo = preview.gizmo ?? null;
		if (visible && view.hideGizmo) {
			this._gizmoHidden = true;

			if (gizmo?.attachedNode || gizmo?.attachedSprite) {
				gizmo.setAttachedObject(null);
			}
		} else if (this._gizmoHidden) {
			this._gizmoHidden = false;
			this._attachSelectionToGizmo();
		}

		const icons = preview.icons ?? null;
		if (visible && view.hideSceneIcons && icons) {
			if (!this._iconsHidden) {
				this._iconsHidden = true;
				this._iconsWereEnabled = icons.enabled;
				this._iconsStopPending = true;
			}

			if (this._iconsStopPending) {
				this._iconsStopPending = false;

				if (icons.enabled) {
					icons.stop();
				}
			}
		} else if (this._iconsHidden) {
			this._iconsHidden = false;

			if (this._iconsWereEnabled && icons && !icons.enabled) {
				icons.start();
			}
		}
	}

	/** Attaches the edited object of the inspector to the gizmo again (the selection made while the tab hid the gizmo). */
	private _attachSelectionToGizmo(): void {
		const object = this._editor.layout.inspector?.state.editedObject;
		if (isNode(object) || isSprite(object)) {
			this._getPreview()?.gizmo?.setAttachedObject(object);
		}
	}

	/**
	 * Runs at every engine frame, also while the edit scene isn't rendered (Play, save, export and loading dialogs), when the per-frame
	 * update of _onFrame doesn't run: the tab turning inactive commits the stroke and hides the cursor, the HUD line and the chips, which
	 * would otherwise stay over the running game (§1.3, §6.8); the viewport helpers follow the visibility of the tab.
	 */
	private _onEngineFrame(): void {
		if (this._disposed) {
			return;
		}

		try {
			const visible = this._isRootVisible();
			const active = this._isTabActive();

			const hidden = this._wasRootVisible && !visible;
			const deactivated = this._wasTabActive && !active;

			this._wasRootVisible = visible;
			this._wasTabActive = active;

			if (hidden) {
				// Hidden while mounted: no brush capture stays armed behind the user's back.
				this._captureArmed = false;
			}

			if (hidden || deactivated) {
				this._deactivate();
			}

			this._applyPreviewHelpers();
		} catch (e) {
			this._reportError(e);
		}
	}

	/** The tab stopped being active (§1.15 tabActive()): implicit commit of the stroke (§7.3), no radial adjust, cursor, HUD line and chips hidden. */
	private _deactivate(): void {
		this._endStroke();
		this._cancelRadialAdjust();
		this._clickCandidate = null;

		this._setHover(null);
		this._hoverDirty = true;
		this._cursor?.update(null);

		this._hud?.hideChips();
		this._updateStatus();
		this._updateHud();
	}

	private _releasePreviewHelpers(): void {
		const preview = this._getPreview();
		if (!preview) {
			return;
		}

		if (this._pickingDisabled) {
			this._pickingDisabled = false;
			this._safe(() => preview.setState({ pickingEnabled: true }));
		}

		if (this._gizmoHidden) {
			this._gizmoHidden = false;
			this._safe(() => this._attachSelectionToGizmo());
		}

		if (this._iconsHidden) {
			this._iconsHidden = false;

			const icons = preview.icons ?? null;
			if (this._iconsWereEnabled && icons && !icons.enabled) {
				this._safe(() => icons.start());
			}
		}
	}

	// Pointer input.

	private _onPrePointer(pointerInfo: PointerInfoPre): void {
		if (this._disposed) {
			return;
		}

		try {
			const event = pointerInfo.event as unknown as ITerrainPointerEventLike;

			switch (pointerInfo.type) {
				case PointerEventTypes.POINTERDOWN:
					this._onPointerDown(pointerInfo, event);
					break;
				case PointerEventTypes.POINTERMOVE:
					this._onPointerMove(pointerInfo, event);
					break;
				case PointerEventTypes.POINTERUP:
					this._onPointerUp(pointerInfo, event);
					break;
				case PointerEventTypes.POINTERWHEEL:
					this._onWheel(pointerInfo, event);
					break;
			}
		} catch (e) {
			this._reportError(e);
		}
	}

	private _onPointerDown(pointerInfo: PointerInfoPre, event: ITerrainPointerEventLike): void {
		this._pointer = { x: event.clientX, y: event.clientY };
		this._consumedPointerId = null;

		if (this._stroke) {
			if (this._stroke.handle.isActive) {
				// Another button or pointer during a stroke never reaches the camera.
				pointerInfo.skipOnPointerObservable = true;
				return;
			}

			this._releaseStroke();
		}

		if ((event.button ?? 0) !== 0 || event.altKey || event.isPrimary === false || pointerInfo.skipOnPointerObservable) {
			return;
		}

		// LMB pressed while RMB or MMB navigates (a chord: Chromium sends it as a pointermove, the cursor is hidden, §1.14): the camera's.
		if (((event.buttons ?? 0) & TERRAIN_NAVIGATION_BUTTONS) !== 0) {
			return;
		}

		if (this._handlePress(event)) {
			pointerInfo.skipOnPointerObservable = true;
			this._consumedPointerId = event.pointerId ?? 1;
		}
	}

	/**
	 * LMB (or pen eraser) press rules of §1.15. Returns true when the press is consumed (always on the target, whatever happens next).
	 * @param event defines the pointer event.
	 */
	private _handlePress(event: ITerrainPointerEventLike): boolean {
		const preview = this._getPreview();
		if (!preview || preview.axis?._axisMeshUnderPointer || !this._isTabActive()) {
			return false;
		}

		if (terrainSettings.category === "settings" || this._navigateMode) {
			return false;
		}

		// Letterbox bars: ignored, never consumed.
		if (!this._getRenderPointerPosition(event.clientX, event.clientY)) {
			return false;
		}

		const ray = this._createPickingRay(event.clientX, event.clientY);
		if (!ray) {
			return false;
		}

		const target = this._target;
		const eligibility = target ? this._getEligibility(target) : null;
		const targetIsTerrain = !!eligibility?.eligible;

		if (!target || !targetIsTerrain) {
			// Not consumed: a click on an eligible terrain still selects it.
			const nearest = pickTerrain(this._editor.layout.preview.scene, ray, { eligibleOnly: true });
			this._rememberClickCandidate(nearest && nearest.mesh !== target ? nearest : null, event);
			return false;
		}

		this._commitRadialAdjust();

		const tool = getActiveTerrainTool(terrainSettings);
		const hit = this._pickTarget(ray, tool === "holes", true);

		if (!hit.target) {
			this._rememberClickCandidate(hit.other, event);
			return false;
		}

		this._clickCandidate = null;

		// Always consumed from here, whatever happens next (§1.15): a press on the target never orbits the camera.
		try {
			this._setHover(hit.target);

			if (this._captureArmed) {
				void this._captureBrush(target, hit.target);
			} else if (this._isEyedropperModifier(event)) {
				this._pickWithEyedropper(target, hit.target);
			} else {
				this._beginStroke(target, ray, event);
			}
		} catch (e) {
			this._reportError(e);
		}

		this._updateStatus();
		return true;
	}

	private _rememberClickCandidate(pick: ITerrainPick | null, event: ITerrainPointerEventLike): void {
		this._clickCandidate = pick ? { mesh: pick.mesh, x: event.clientX, y: event.clientY, pointerId: event.pointerId ?? 1 } : null;
	}

	private _beginStroke(target: Mesh, ray: Ray, event: ITerrainPointerEventLike): void {
		const tool = getActiveTerrainTool(terrainSettings);
		if (!tool) {
			return;
		}

		const invert = this._getEffectiveInvert(event);
		const layerId = isTerrainPaintTool(tool) ? getActiveTerrainLayerId(target.material) : null;
		const request = buildTerrainStrokeRequest(terrainSettings, this._getShape(), layerId, invert, createTerrainStrokeSeed());

		this._beginningStroke = true;

		let result: ITerrainBeginStrokeResult;
		try {
			result = beginTerrainStroke(this._editor, target, request, this._createSample(ray, event, invert));
		} finally {
			this._beginningStroke = false;
		}

		if (result.handle) {
			const pointerId = event.pointerId ?? 1;

			this._stroke = { handle: result.handle, pointerId, button: event.button ?? 0, tool, lastLocal: null, heading: 0 };
			this._pressRefusal = null;
			this._hoverDirty = true;

			try {
				this._canvas?.setPointerCapture(pointerId);
			} catch (e) {
				// The pointer may already be released (synthetic events).
			}

			return;
		}

		const message = result.message ?? (result.refusal ? TERRAIN_VIEWPORT_REFUSAL_MESSAGES[result.refusal] : null);
		if (message) {
			this._pressRefusal = { refusal: result.refusal, message, timeMs: getTerrainNowMs() };
			this._hud?.showPointerChip(message, event.clientX, event.clientY);
		}
	}

	private _onPointerMove(pointerInfo: PointerInfoPre, event: ITerrainPointerEventLike): void {
		this._pointer = { x: event.clientX, y: event.clientY };
		this._shiftDown = !!event.shiftKey;
		this._navigationButtonsDown = ((event.buttons ?? 0) & 6) !== 0;

		const stroke = this._stroke;
		if (stroke) {
			if (!stroke.handle.isActive) {
				this._releaseStroke();
			} else if ((event.pointerId ?? 1) === stroke.pointerId) {
				pointerInfo.skipOnPointerObservable = true;
				this._addStrokeSamples(stroke, event);
				this._hoverDirty = true;
				return;
			}
		} else {
			// Without pointer capture, moves only come from the canvas.
			this._pointerOverCanvas = true;
		}

		if (this._radial && (event.buttons ?? 0) === 0) {
			this._updateRadialAdjust(event.clientX, event.clientY);
		}

		this._hoverDirty = true;
	}

	private _addStrokeSamples(stroke: ITerrainViewportStroke, event: ITerrainPointerEventLike): void {
		const preview = this._getPreview();
		if (!preview) {
			return;
		}

		let events: ITerrainPointerEventLike[] = [event];
		try {
			const coalesced = event.getCoalescedEvents?.();
			if (coalesced?.length) {
				events = coalesced;
			}
		} catch (e) {
			// Untrusted or synthetic events.
		}

		for (const sampleEvent of events) {
			const ray = this._createPickingRay(sampleEvent.clientX, sampleEvent.clientY);
			if (!ray) {
				continue;
			}

			stroke.handle.addSample(this._createSample(ray, sampleEvent, this._getEffectiveInvert(sampleEvent)));
		}
	}

	private _onPointerUp(pointerInfo: PointerInfoPre, event: ITerrainPointerEventLike): void {
		const pointerId = event.pointerId ?? 1;

		const stroke = this._stroke;
		if (stroke) {
			// Only the release of the button that began the stroke ends it (§1.15: LMB up).
			if (pointerId === stroke.pointerId && (event.button ?? 0) === stroke.button) {
				pointerInfo.skipOnPointerObservable = true;
				this._consumedPointerId = null;
				this._endStroke();
				return;
			}

			if (!stroke.handle.isActive) {
				// Committed elsewhere (undo, save, Play): only the pointer capture was left.
				this._releaseStroke();
			} else if (pointerId === stroke.pointerId) {
				// Another button of the stroke's pointer released (RMB/MMB chord, a mouse is always pointer 1): the stroke goes on and the up
				// reaches the camera, which would otherwise keep rotating at every later move.
				return;
			}
		}

		if (this._consumedPointerId !== null && pointerId === this._consumedPointerId && (event.button ?? 0) === 0) {
			// The press was consumed (refusal, eyedropper, capture): its release doesn't reach the camera either.
			pointerInfo.skipOnPointerObservable = true;
			this._consumedPointerId = null;
			return;
		}

		const candidate = this._clickCandidate;
		this._clickCandidate = null;

		if (!candidate || (event.button ?? 0) !== 0 || candidate.pointerId !== pointerId) {
			return;
		}

		const distance = Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y);
		if (distance <= TERRAIN_CLICK_SELECT_DISTANCE_PX && !candidate.mesh.isDisposed()) {
			this._selectTerrain(candidate.mesh);
		}
	}

	private _onWheel(pointerInfo: PointerInfoPre, event: ITerrainPointerEventLike): void {
		if (!this._isTabActive()) {
			return;
		}

		// macOS: Cmd (a trackpad pinch sends ctrlKey without Cmd). Others: the physical Control key (a touchpad pinch sends ctrlKey alone).
		const modifier = this._isMac ? !!event.metaKey : !!event.ctrlKey && this._controlDown;
		if (!modifier) {
			return;
		}

		pointerInfo.skipOnPointerObservable = true;
		event.preventDefault?.();

		// Babylon notifies the same DOM event once per non-zero axis.
		if (this._lastWheelEvent === event) {
			return;
		}

		const shift = !!event.shiftKey;
		let delta = 0;

		if (event.inputIndex === PointerInput.MouseWheelY) {
			delta = event.deltaY ?? 0;
		} else if (shift && event.inputIndex === PointerInput.MouseWheelX) {
			// macOS turns Shift + wheel into horizontal scrolling.
			delta = event.deltaX ?? 0;
		}

		if (!delta || !Number.isFinite(delta)) {
			return;
		}

		this._lastWheelEvent = event;

		const notches = this._getWheelNotches(delta);
		if (!notches) {
			return;
		}

		const direction = delta < 0 ? 1 : -1;

		if (shift) {
			this._adjustStrength(direction * notches * TERRAIN_WHEEL_STRENGTH_STEP);
		} else {
			this._adjustRadius(Math.pow(TERRAIN_WHEEL_RADIUS_FACTOR, direction * notches));
		}
	}

	private _getWheelNotches(delta: number): number {
		const magnitude = Math.abs(delta);
		const now = getTerrainNowMs();

		if (magnitude < TERRAIN_WHEEL_SMALL_DELTA) {
			if (now - this._lastSmallWheelStepMs < TERRAIN_WHEEL_SMALL_DELTA_INTERVAL_MS) {
				return 0;
			}

			this._lastSmallWheelStepMs = now;
			return 1;
		}

		return Math.min(TERRAIN_WHEEL_MAX_NOTCHES, Math.max(1, Math.round(magnitude / TERRAIN_WHEEL_NOTCH_PIXELS)));
	}

	// DOM listeners (canvas, document, window).

	private _onCanvasPointerEnter(): void {
		this._safe(() => {
			this._pointerOverCanvas = true;
			this._hoverDirty = true;
		});
	}

	private _onCanvasPointerLeave(): void {
		this._safe(() => {
			this._pointerOverCanvas = false;
			this._navigationButtonsDown = false;
			this._setHover(null);
			this._cursor?.update(null);
			this._updateStatus();
		});
	}

	/** The pen eraser end (button 5) never reaches onPrePointerObservable (Babylon forwards the pen tip only): it strokes from here. */
	private _onCanvasPointerDown(event: PointerEvent): void {
		this._safe(() => {
			if (event.pointerType !== "pen" || event.button !== TERRAIN_PEN_ERASER_BUTTON || this._stroke || event.altKey) {
				return;
			}

			this._pointer = { x: event.clientX, y: event.clientY };
			this._handlePress(event);
		});
	}

	/** pointerup, pointercancel and lostpointercapture of the stroke's pointer commit the stroke (§1.15). */
	private _onCanvasPointerEnd(event: PointerEvent): void {
		this._safe(() => {
			if (this._stroke && (event.pointerId ?? 1) === this._stroke.pointerId) {
				this._endStroke();
			}
		});
	}

	private _onWindowBlur(): void {
		this._safe(() => {
			this._controlDown = false;
			this._shiftDown = false;
			this._navigationButtonsDown = false;

			this._commitRadialAdjust();
			this._endStroke();
		});
	}

	private _onKeyDown(event: KeyboardEvent): void {
		this._safe(() => {
			if (event.key === "Control") {
				this._controlDown = true;
			} else if (event.key === "Shift") {
				this._shiftDown = true;
				this._hoverDirty = true;
			}

			if (this._disposed || !this._isTabActive() || !this._isShortcutContext()) {
				return;
			}

			const action = getTerrainShortcutAction(event, terrainSettings.category, this._getCameraKeyCodes());
			if (action && this._executeShortcut(action)) {
				event.preventDefault();
			}
		});
	}

	private _onKeyUp(event: KeyboardEvent): void {
		this._safe(() => {
			if (event.key === "Control") {
				this._controlDown = false;
			} else if (event.key === "Shift") {
				this._shiftDown = false;
				this._hoverDirty = true;
			}

			if (event.code === "KeyB" && this._radial) {
				this._commitRadialAdjust();
			}
		});
	}

	// Shortcuts.

	private _executeShortcut(action: TerrainShortcutAction): boolean {
		switch (action.type) {
			case "radius":
				this._adjustRadius(action.factor);
				return true;

			case "strength":
				this._adjustStrength(action.delta);
				return true;

			case "hardness": {
				const hardness = clamp(roundTerrainValue(terrainSettings.brush.hardness + action.delta, 2), 0, 0.95);
				updateTerrainSettings(
					(settings) => {
						settings.brush.hardness = hardness;
					},
					["brush.hardness"]
				);
				this._hud?.showValueChip(`Hardness ${formatTerrainHudPercent(hardness)}`);
				return true;
			}

			case "rotation": {
				const rotation = wrapTerrainDegrees(terrainSettings.brush.rotation + action.delta);
				updateTerrainSettings(
					(settings) => {
						settings.brush.rotation = rotation;
					},
					["brush.rotation"]
				);
				this._hud?.showValueChip(`Rotation ${Math.round(rotation)}°`);
				return true;
			}

			case "sculpt-tool":
				updateTerrainSettings(
					(settings) => {
						settings.category = "sculpt";
						settings.sculptTool = action.tool;
					},
					["category", "sculptTool"]
				);
				this._hud?.showValueChip(TERRAIN_TOOL_LABELS[action.tool]);
				return true;

			case "paint-tool":
				updateTerrainSettings(
					(settings) => {
						settings.paintTool = action.tool;
					},
					["paintTool"]
				);
				this._hud?.showValueChip(TERRAIN_TOOL_LABELS[action.tool]);
				return true;

			case "paint-layer":
				this._selectPaintLayer(action.index);
				return true;

			case "toggle-category": {
				const category = terrainSettings.category === "sculpt" ? "paint" : "sculpt";
				updateTerrainSettings(
					(settings) => {
						settings.category = category;
					},
					["category"]
				);
				this._hud?.showValueChip(category === "sculpt" ? "Sculpt" : "Paint");
				return true;
			}

			case "toggle-invert": {
				const invert = !terrainSettings.invertToggle;
				updateTerrainSettings(
					(settings) => {
						settings.invertToggle = invert;
					},
					["invertToggle"]
				);
				this._hud?.showValueChip(invert ? "Inverted" : "Not inverted");
				return true;
			}

			case "eyedropper": {
				const target = this._target;
				const hover = this._hover;
				return !!target && !!hover && hover.mesh === target && this._pickWithEyedropper(target, hover);
			}

			case "cycle-overlay": {
				const overlay = getNextTerrainOverlay(terrainSettings.view.overlay, terrainSettings.category);
				updateTerrainSettings(
					(settings) => {
						settings.view.overlay = overlay;
					},
					["view.overlay"]
				);
				this._hud?.showValueChip(`Overlay: ${getTerrainOverlayLabel(overlay)}`);
				return true;
			}

			case "toggle-hud": {
				const show = !terrainSettings.view.showHud;
				updateTerrainSettings(
					(settings) => {
						settings.view.showHud = show;
						settings.view.showFootprint = show;
					},
					["view.showHud", "view.showFootprint"]
				);
				this._hud?.showValueChip(show ? "HUD on" : "HUD off");
				return true;
			}

			case "toggle-navigate":
				this.setNavigateMode(!this._navigateMode);
				this._hud?.showValueChip(this._navigateMode ? "Navigate" : "Edit");
				return true;

			case "radial-adjust":
				return this._startRadialAdjust();

			case "escape":
				return this._handleEscape();
		}

		return false;
	}

	private _adjustRadius(factor: number): void {
		const range = this._getRadiusRange();
		const bounds = range ?? TERRAIN_RADIUS_FALLBACK_RANGE;
		const radius = clamp(roundTerrainValue(terrainSettings.brush.radius * factor, 2), bounds.min, bounds.max);

		if (radius !== terrainSettings.brush.radius) {
			updateTerrainSettings(
				(settings) => {
					settings.brush.radius = radius;
				},
				["brush.radius"]
			);
		}

		this._hud?.showValueChip(`Radius ${formatTerrainHudLength(radius)}`);
	}

	private _adjustStrength(delta: number): void {
		const tool = getActiveTerrainTool(terrainSettings) ?? terrainSettings.sculptTool;
		const strength = clamp(roundTerrainValue((terrainSettings.strength[tool] ?? 0) + delta, 2), 0, 1);

		if (strength !== terrainSettings.strength[tool]) {
			updateTerrainSettings(
				(settings) => {
					settings.strength[tool] = strength;
				},
				[`strength.${tool}`]
			);
		}

		this._hud?.showValueChip(`Strength ${formatTerrainHudPercent(strength)}`);
	}

	private _selectPaintLayer(index: number): void {
		if (terrainSettings.category !== "paint") {
			updateTerrainSettings(
				(settings) => {
					settings.category = "paint";
				},
				["category"]
			);
		}

		const target = this._target;
		const material = target?.material ?? null;
		const layer = target ? getTerrainPlugin(target)?.data.layers[index] : undefined;

		if (material && layer) {
			setActiveTerrainLayerId(material, layer.id);
			this._hud?.showValueChip(`Layer “${layer.name}”`);
		} else {
			this._hud?.showValueChip("Paint");
		}
	}

	private _handleEscape(): boolean {
		if (this._radial) {
			this._cancelRadialAdjust();
			return true;
		}

		if (this._captureArmed) {
			this._captureArmed = false;
			this._updateStatus();
			this._updateHud();
			return true;
		}

		const stroke = this._stroke;
		if (stroke) {
			this._releaseStroke();

			try {
				stroke.handle.cancel();
			} catch (e) {
				this._reportError(e);
			}

			this._updateStatus();
			return true;
		}

		// Nothing to cancel: Escape keeps its editor meaning.
		return false;
	}

	// Radial adjust (hold B).

	private _startRadialAdjust(): boolean {
		const tool = getActiveTerrainTool(terrainSettings);
		if (!tool) {
			return false;
		}

		if (this._radial) {
			return true;
		}

		const bounds = this._getRadiusRange() ?? TERRAIN_RADIUS_FALLBACK_RANGE;
		const radius = terrainSettings.brush.radius;
		const strength = terrainSettings.strength[tool] ?? 0;
		const anchor = this._hover && this._hover.mesh === this._target ? this._hover.worldPoint.clone() : null;

		this._radial = {
			tool,
			radius0: radius,
			strength0: strength,
			x0: this._pointer?.x ?? null,
			y0: this._pointer?.y ?? null,
			radius,
			strength,
			min: bounds.min,
			max: bounds.max,
			anchor,
		};

		this._hud?.showValueChip(`r ${formatTerrainHudLength(radius)} · ${formatTerrainHudPercent(strength)}`);
		return true;
	}

	private _updateRadialAdjust(x: number, y: number): void {
		const radial = this._radial!;

		if (radial.x0 === null || radial.y0 === null) {
			radial.x0 = x;
			radial.y0 = y;
		}

		radial.radius = clamp(roundTerrainValue(radial.radius0 * Math.exp((x - radial.x0) / TERRAIN_RADIAL_RADIUS_PX), 2), radial.min, radial.max);
		radial.strength = clamp(roundTerrainValue(radial.strength0 - (y - radial.y0) / TERRAIN_RADIAL_STRENGTH_PX, 2), 0, 1);

		this._hud?.showValueChip(`r ${formatTerrainHudLength(radial.radius)} · ${formatTerrainHudPercent(radial.strength)}`);
	}

	private _commitRadialAdjust(): void {
		const radial = this._radial;
		if (!radial) {
			return;
		}

		this._radial = null;

		if (radial.radius !== radial.radius0 || radial.strength !== radial.strength0) {
			updateTerrainSettings(
				(settings) => {
					settings.brush.radius = radial.radius;
					settings.strength[radial.tool] = radial.strength;
				},
				["brush.radius", `strength.${radial.tool}`]
			);
		}
	}

	private _cancelRadialAdjust(): void {
		if (this._radial) {
			this._radial = null;
			this._hud?.showValueChip(`r ${formatTerrainHudLength(terrainSettings.brush.radius)}`);
		}
	}

	// Strokes.

	private _createSample(ray: Ray, event: ITerrainPointerEventLike, invert: boolean): ITerrainPointerSample {
		return {
			ray,
			pressure: typeof event.pressure === "number" && Number.isFinite(event.pressure) ? event.pressure : 1,
			pointerType: event.pointerType || "mouse",
			timeMs: typeof event.timeStamp === "number" && event.timeStamp > 0 ? event.timeStamp : getTerrainNowMs(),
			invert,
		};
	}

	/** Sticky toggle XOR Shift XOR pen eraser (re-read at every sample). */
	private _getEffectiveInvert(event: ITerrainPointerEventLike): boolean {
		const eraser = ((event.buttons ?? 0) & TERRAIN_PEN_ERASER_BUTTONS) !== 0 || event.button === TERRAIN_PEN_ERASER_BUTTON;
		return (terrainSettings.invertToggle !== !!event.shiftKey) !== eraser;
	}

	/** Inversion shown by the cursor and the HUD while hovering. */
	private _getHoverInvert(): boolean {
		return terrainSettings.invertToggle !== this._shiftDown;
	}

	/** Commits the active stroke (implicit commits of §7.3) and releases the pointer capture. */
	private _endStroke(): void {
		const stroke = this._stroke;
		if (!stroke) {
			return;
		}

		this._releaseStroke();

		try {
			if (stroke.handle.isActive) {
				stroke.handle.end();
			}
		} catch (e) {
			this._reportError(e);
		}

		this._hoverDirty = true;
		this._updateStatus();
	}

	private _releaseStroke(): void {
		const stroke = this._stroke;
		if (!stroke) {
			return;
		}

		this._stroke = null;
		this._footprintCache = null;

		try {
			if (this._canvas?.hasPointerCapture?.(stroke.pointerId)) {
				this._canvas.releasePointerCapture(stroke.pointerId);
			}
		} catch (e) {
			// Already released.
		}
	}

	// Eyedropper, brush capture, selection.

	private _isEyedropperModifier(event: ITerrainPointerEventLike): boolean {
		return this._isMac ? !!event.metaKey : !!event.ctrlKey;
	}

	/** Height for Flatten / Set height, dominant layer in Paint (§1.15). Returns false when nothing applies. */
	private _pickWithEyedropper(target: Mesh, pick: ITerrainPick): boolean {
		if (terrainSettings.category === "paint") {
			const layerId = this._getDominantLayerId(target, pick.worldPoint);
			const layer = layerId ? getTerrainPlugin(target)?.data.layers.find((l) => l.id === layerId) : undefined;

			if (!layer || !target.material) {
				return false;
			}

			setActiveTerrainLayerId(target.material, layer.id);
			this._hud?.showValueChip(`Layer “${layer.name}”`);
			return true;
		}

		const tool = getActiveTerrainTool(terrainSettings);
		if (tool !== "flatten" && tool !== "set-height") {
			return false;
		}

		const surface = sampleTerrainSurface(target, pick.worldPoint.x, pick.worldPoint.z);
		const height = roundTerrainValue(surface?.heightWorld ?? pick.worldPoint.y, 2);

		updateTerrainSettings(
			(settings) => {
				if (tool === "flatten") {
					settings.sculpt.flatten.heightWorld = height;
					settings.sculpt.flatten.target = "fixed";
				} else {
					settings.sculpt.setHeight.heightWorld = height;
				}
			},
			tool === "flatten" ? ["sculpt.flatten.heightWorld", "sculpt.flatten.target"] : ["sculpt.setHeight.heightWorld"]
		);

		this._hud?.showValueChip(`Height ${height.toFixed(1)} cm`);
		return true;
	}

	private _getDominantLayerId(target: Mesh, point: Vector3): string | null {
		const weights = sampleTerrainLayerWeights(target, point.x, point.z);
		if (!weights?.length) {
			return null;
		}

		let best = 0;
		for (let i = 1; i < weights.length; ++i) {
			if (weights[i] > weights[best]) {
				best = i;
			}
		}

		return getTerrainPlugin(target)?.data.layers[best]?.id ?? null;
	}

	/** Captures the heights under the footprint as a 16-bit brush (§1.9, §4.16), selects it and applies its defaults. */
	private async _captureBrush(target: Mesh, pick: ITerrainPick): Promise<void> {
		this._captureArmed = false;
		this._updateStatus();

		try {
			const radius = terrainSettings.brush.radius;
			const rotation = toTerrainRadians(terrainSettings.brush.rotation);
			const center = pick.worldPoint.clone();

			const patch = getTerrainHeightPatch(target, center, radius, rotation, TERRAIN_CAPTURE_RESOLUTION);
			if (!patch) {
				return;
			}

			// §4.16: stamping the captured brush with this height reproduces the captured relief.
			const stampHeight = roundTerrainValue(Math.max(0, patch.maxHeight - patch.minHeight), 2);

			const library = TerrainBrushLibrary.Get();
			const brush = await library.addCapturedBrush(patch, getTerrainCaptureName(library.brushes.map((b) => b.name)), { radius, stampHeight, rotation: 0 });

			updateTerrainSettings(
				(settings) => {
					settings.brush.brushId = brush.id;

					if (settings.brush.applyBrushDefaults) {
						settings.brush.rotation = 0;
						settings.sculpt.stamp.heightWorld = stampHeight;
					}
				},
				["brush.brushId", "brush.rotation", "sculpt.stamp.heightWorld"]
			);

			toast.success(`Brush “${brush.name}” captured.`);
		} catch (e) {
			this._reportError(e);
		} finally {
			this._updateStatus();
		}
	}

	private _selectTerrain(mesh: Mesh): void {
		const layout = this._editor.layout;

		layout.graph.setSelectedNode(mesh);
		layout.inspector.setEditedObject(mesh);

		// Detached again at the next frame while the tab hides the gizmo (the edited object is attached back when it stops hiding it).
		this._safe(() => layout.preview.gizmo?.setAttachedObject(mesh));
		this._safe(() => layout.animations?.setEditedObject(mesh));
	}

	// Frame update (cursor, HUD, status).

	private _onFrame(): void {
		if (this._disposed) {
			return;
		}

		try {
			const scene = this._scene;
			if (!scene || scene.isDisposed) {
				return;
			}

			// Once per engine frame (the camera preview renders the scene several times per frame).
			const frameId = scene.getEngine().frameId;
			if (frameId === this._lastFrameId) {
				return;
			}

			this._lastFrameId = frameId;

			// The stroke being drawn is processed once per frame, within its time budget.
			processActiveTerrainStroke(this._editor);

			this._applyPreviewHelpers();

			if (this._stroke && !this._stroke.handle.isActive) {
				this._releaseStroke();
			}

			this._updateHover();
			this._updateStatus();
			this._updateCursor();
			this._updateHud();
		} catch (e) {
			this._reportError(e);
		}
	}

	private _updateHover(): void {
		const target = this._target;
		const preview = this._getPreview();
		const pointer = this._pointer;

		if (!target || !preview || !pointer || !this._pointerOverCanvas || !this._isTabActive() || target.isDisposed()) {
			this._setHover(null);
			return;
		}

		// Picked at most once per frame, when the pointer or the camera moved, the terrain changed or a stroke runs.
		const cameraKey = getTerrainCameraKey(this._scene);
		if (!this._hoverDirty && !this._stroke && this._hoverVersion === this._terrainVersion && this._hoverCameraKey === cameraKey) {
			return;
		}

		this._hoverDirty = false;
		this._hoverVersion = this._terrainVersion;
		this._hoverCameraKey = cameraKey;

		const ray = this._createPickingRay(pointer.x, pointer.y);
		if (!ray) {
			this._setHover(null);
			return;
		}

		const tool = getActiveTerrainTool(terrainSettings);
		this._setHover(this._pickTarget(ray, tool === "holes", false).target);
	}

	private _setHover(pick: ITerrainPick | null): void {
		this._hover = pick;
		this._hoverSurface = null;

		if (!pick) {
			return;
		}

		this._hoverSurface = sampleTerrainSurface(pick.mesh, pick.worldPoint.x, pick.worldPoint.z);
		this._lastTargetPoint = pick.worldPoint.clone();
		this._lastTargetPointMesh = pick.mesh;

		// Stroke heading (Follow stroke direction) in metric-local space, as the dab emitter measures it.
		const stroke = this._stroke;
		if (stroke) {
			const local = pick.localPoint;
			if (stroke.lastLocal) {
				const metric = getTerrainMetric(pick.mesh.getWorldMatrix());
				const dx = (local.x - stroke.lastLocal.x) * metric.sx;
				const dz = (local.z - stroke.lastLocal.z) * metric.sz;

				if (dx * dx + dz * dz > 1e-6) {
					stroke.heading = Math.atan2(dz, dx);
					stroke.lastLocal = { x: local.x, z: local.z };
				}
			} else {
				stroke.lastLocal = { x: local.x, z: local.z };
			}
		}
	}

	private _updateCursor(): void {
		const cursor = this._cursor;
		if (cursor) {
			cursor.update(this._buildCursorFrame());
		}
	}

	private _buildCursorFrame(): ITerrainBrushCursorFrame | null {
		const target = this._target;
		const tool = getActiveTerrainTool(terrainSettings);

		if (!target || !tool || !this._canEdit() || this._navigationButtonsDown || !this._pointerOverCanvas) {
			return null;
		}

		const stroke = this._stroke;
		const preview = stroke?.handle.preview ?? null;
		const hover = this._hover && this._hover.mesh === target ? this._hover : null;

		let center: Vector3 | null = hover?.worldPoint ?? null;
		if (this._radial?.anchor) {
			center = this._radial.anchor;
		} else if (preview?.lazyCenter) {
			center = preview.lazyCenter;
		}

		if (!center) {
			return null;
		}

		const brush = terrainSettings.brush;
		const radius = this._radial ? this._radial.radius : brush.radius;
		const rotation = this._getBrushRotation();
		const shape = this._getShape();
		const inverted = this._getHoverInvert();
		const refused = !stroke && this._predictedRefusal !== null;

		const matrix = target.getWorldMatrix();
		const axisX = new Vector3(matrix.m[0], matrix.m[1], matrix.m[2]).normalize();
		const axisZ = new Vector3(matrix.m[8], matrix.m[9], matrix.m[10]).normalize();
		const normal = hover?.worldNormal ?? this._hoverSurface?.normalWorld ?? Vector3.Up();

		const request = this._getPreviewRequest(target, tool);

		return {
			center,
			axisX,
			axisZ,
			normal,
			radius,
			hardness: brush.hardness,
			rotationRadians: rotation,
			showRotationTick: shape.kind !== "round" || brush.rotation !== 0,
			color: this._getCursorColor(target, tool, inverted),
			refused,
			sampleHeight: (x, z) => sampleTerrainSurface(target, x, z)?.heightWorld ?? null,
			footprint: terrainSettings.view.showFootprint && !this._radial ? this._getFootprint(target, request, center, rotation) : null,
			targetHeightWorld: this._getTargetHeightWorld(tool, center),
			ramp: stroke && tool === "ramp" && preview?.rampStart && preview.rampEnd ? { start: preview.rampStart, end: preview.rampEnd } : null,
			lazyLine: preview?.lazyCenter && hover ? { from: hover.worldPoint, to: preview.lazyCenter } : null,
		};
	}

	private _getFootprint(target: Mesh, request: ITerrainStrokeRequest, center: Vector3, rotation: number): ITerrainFootprint | null {
		// Recomputed only when the centre, the request or the terrain version changed (§1.14).
		const key = `${target.uniqueId}|${center.x}|${center.y}|${center.z}|${rotation}|${this._terrainVersion}`;
		const cache = this._footprintCache;

		if (cache && cache.key === key && cache.request === request) {
			return cache.footprint;
		}

		const footprint = evaluateTerrainFootprint(target, request, center, rotation, TERRAIN_FOOTPRINT_GRID_SIZE);
		this._footprintCache = { key, request, footprint };

		return footprint;
	}

	private _getTargetHeightWorld(tool: TerrainTool, center: Vector3): number | null {
		const stroke = this._stroke;
		if (stroke) {
			return stroke.handle.preview.targetHeightWorld ?? null;
		}

		if (tool === "set-height") {
			return terrainSettings.sculpt.setHeight.heightWorld;
		}

		if (tool !== "flatten") {
			return null;
		}

		switch (terrainSettings.sculpt.flatten.target) {
			case "fixed":
				return terrainSettings.sculpt.flatten.heightWorld;
			case "stroke-start":
				return center.y;
			default:
				return null;
		}
	}

	private _getCursorColor(target: Mesh, tool: TerrainTool, inverted: boolean): Color3 {
		switch (tool) {
			case "paint":
			case "replace": {
				if (tool === "paint" && inverted) {
					return Color3.FromHexString(TERRAIN_ERASE_CURSOR_COLOR);
				}

				const layerId = getActiveTerrainLayerId(target.material);
				const tint = layerId ? getTerrainPlugin(target)?.data.layers.find((layer) => layer.id === layerId)?.tint : undefined;

				return tint ? new Color3(tint[0], tint[1], tint[2]) : Color3.White();
			}

			case "blend":
			case "auto-paint":
				return Color3.White();

			default: {
				const colors = TERRAIN_SCULPT_CURSOR_COLORS[tool];
				return Color3.FromHexString(inverted ? colors[1] : colors[0]);
			}
		}
	}

	private _updateHud(): void {
		const hud = this._hud;
		if (hud) {
			hud.setLine(this._computeHudLine());
		}
	}

	private _computeHudLine(): string | null {
		const target = this._target;
		if (!terrainSettings.view.showHud || !target || !this._isTabActive()) {
			return null;
		}

		const eligibility = this._getEligibility(target);
		if (!eligibility?.eligible) {
			return null;
		}

		if (this._captureArmed) {
			return TERRAIN_CAPTURE_HINT;
		}

		const tool = getActiveTerrainTool(terrainSettings);
		if (!tool) {
			return null;
		}

		if (!this._navigateMode && !this._stroke && this._predictedRefusal) {
			return `${TERRAIN_TOOL_LABELS[tool]} · ${TERRAIN_VIEWPORT_REFUSAL_MESSAGES[this._predictedRefusal]}`;
		}

		const radial = this._radial;
		const hover = this._hover && this._hover.mesh === target && this._pointerOverCanvas ? this._hoverSurface : null;

		return formatTerrainHudLine({
			tool,
			radius: radial ? radial.radius : terrainSettings.brush.radius,
			strength: radial && radial.tool === tool ? radial.strength : (terrainSettings.strength[tool] ?? 0),
			brushName: this._getBrushName(),
			inverted: this._getHoverInvert(),
			navigate: this._navigateMode,
			surface: hover ? { heightWorld: hover.heightWorld, slopeDegrees: hover.slopeDegrees } : null,
		});
	}

	private _getBrushName(): string {
		const id = terrainSettings.brush.brushId;

		try {
			return TerrainBrushLibrary.Get().getBrush(id)?.name ?? id;
		} catch (e) {
			return id;
		}
	}

	// Status.

	private _updateStatus(): void {
		if (this._disposed || this._beginningStroke) {
			return;
		}

		this._refreshPredictedRefusal();

		const status = this._computeStatus();
		const previous = this._lastStatus;
		this._lastStatus = status;

		if (isSameTerrainViewportStatus(status, previous)) {
			return;
		}

		try {
			this._options.onStatusChanged?.(status);
		} catch (e) {
			this._reportError(e);
		}
	}

	private _refreshPredictedRefusal(): void {
		this._predictedRefusal = null;

		const target = this._target;
		const tool = getActiveTerrainTool(terrainSettings);

		if (this._stroke || !target || !tool || !this._isTabActive() || target.isDisposed()) {
			return;
		}

		const eligibility = this._getEligibility(target);
		if (!eligibility?.eligible) {
			return;
		}

		this._predictedRefusal = canBeginTerrainStroke(this._editor, target, this._getPreviewRequest(target, tool));
	}

	private _computeStatus(): ITerrainViewportStatus {
		let message: string | null = null;

		if (this._captureArmed) {
			message = TERRAIN_CAPTURE_HINT;
		} else if (this._predictedRefusal) {
			message = TERRAIN_VIEWPORT_REFUSAL_MESSAGES[this._predictedRefusal];
		} else if (this._pressRefusal) {
			if (getTerrainNowMs() - this._pressRefusal.timeMs <= TERRAIN_PRESS_REFUSAL_HINT_MS) {
				message = this._pressRefusal.message;
			} else {
				this._pressRefusal = null;
			}
		}

		return {
			canEdit: this._canEdit(),
			message,
			hover: this._hover,
			strokeActive: this._stroke !== null,
			navigateMode: this._navigateMode,
			captureArmed: this._captureArmed,
			predictedRefusal: this._predictedRefusal,
		};
	}

	// Settings, brush shape, overlays.

	private _onSettingsChanged(): void {
		if (this._disposed) {
			return;
		}

		// A category or tool switch commits the stroke (§7.3).
		if (this._stroke && getActiveTerrainTool(terrainSettings) !== this._stroke.tool) {
			this._endStroke();
		}

		if (terrainSettings.brush.brushId !== this._shapeBrushId) {
			this._resolveBrushShape(false);
		}

		this._applyPreviewHelpers();

		this._hoverDirty = true;
		this._updateStatus();
		this._updateHud();
	}

	private _resolveBrushShape(force: boolean): void {
		const brush = terrainSettings.brush;
		const id = brush.brushId;

		if (!force && id === this._shapeBrushId && this._shape) {
			return;
		}

		this._shapeBrushId = id;
		const generation = ++this._shapeGeneration;
		const base = { falloff: brush.falloff, hardness: brush.hardness, edgeFalloff: brush.edgeFalloff };

		if (id === "builtin:round" || id === "builtin:square") {
			this._setShape({ id, kind: id === "builtin:round" ? "round" : "square", mask: null, ...base });
			return;
		}

		let library: TerrainBrushLibrary;
		try {
			library = TerrainBrushLibrary.Get();
		} catch (e) {
			this._setShape(createTerrainRoundShape(base));
			return;
		}

		library
			.resolveShape(id, base)
			.then((shape) => {
				if (!this._disposed && generation === this._shapeGeneration) {
					this._setShape(shape);
				}
			})
			.catch((e) => {
				if (!this._disposed && generation === this._shapeGeneration) {
					this._setShape(createTerrainRoundShape(base));
					this._reportError(e);
				}
			});
	}

	private _setShape(shape: ITerrainBrushShape): void {
		this._shape = shape;
		this._previewRequest = null;
		this._footprintCache = null;
	}

	/** Resolved shape with the current falloff, hardness and edge falloff (they don't need a new mask). */
	private _getShape(): ITerrainBrushShape {
		const brush = terrainSettings.brush;
		let shape = this._shape ?? createTerrainRoundShape(brush);

		if (shape !== this._shape || shape.falloff !== brush.falloff || shape.hardness !== brush.hardness || shape.edgeFalloff !== brush.edgeFalloff) {
			shape = { ...shape, falloff: brush.falloff, hardness: brush.hardness, edgeFalloff: brush.edgeFalloff };
			this._shape = shape;
		}

		return shape;
	}

	/** Request of the cursor (footprint, refusal pre-check): rebuilt when the settings, the inversion, the layer or the shape change. */
	private _getPreviewRequest(target: Mesh, tool: TerrainTool): ITerrainStrokeRequest {
		const invert = this._getHoverInvert();
		const layerId = isTerrainPaintTool(tool) ? getActiveTerrainLayerId(target.material) : null;
		const shape = this._getShape();
		const key = `${getTerrainSettingsRevision()}|${tool}|${invert}|${layerId}`;

		const cache = this._previewRequest;
		if (cache && cache.key === key && cache.shape === shape) {
			return cache.request;
		}

		const request = buildTerrainStrokeRequest(terrainSettings, shape, layerId, invert, 0);
		this._previewRequest = { key, shape, request };

		return request;
	}

	private _getBrushRotation(): number {
		const brush = terrainSettings.brush;
		const heading = brush.followStroke && this._stroke ? this._stroke.heading : 0;

		return toTerrainRadians(brush.rotation) + heading;
	}

	// Target helpers.

	/**
	 * Grid or node change of the target (same Mesh object): drops its cached radius range and, like a target change (§4.17), clamps the
	 * radius when the target just became an eligible terrain (unlocked, shown...) or when its grid changed (resize, resample). So a terrain at
	 * S = 512 (200 cm cells) takes 400 cm instead of the default 150 cm and never gets one-vertex spikes. Other node changes keep a radius
	 * chosen in the field (down to 1.5 cells).
	 * @param gridChanged defines whether the grid of the target changed.
	 */
	private _onTargetStructureChanged(gridChanged: boolean): void {
		const wasTerrain = this._targetIsTerrain;
		this._targetIsTerrain = this._isTargetTerrain();

		this._radiusRangeCache = null;

		if (this._targetIsTerrain && (gridChanged || !wasTerrain)) {
			this._clampRadiusToTarget();
		}
	}

	/** Whether the target is an eligible terrain (read-only ones included), from the cached eligibility. */
	private _isTargetTerrain(): boolean {
		const eligibility = this._target ? this._getEligibility(this._target) : null;
		return !!eligibility?.eligible;
	}

	private _clampRadiusToTarget(): void {
		const range = this._getRadiusRange();
		if (!range) {
			return;
		}

		const radius = terrainSettings.brush.radius;
		const clamped = clamp(radius, range.targetMin, range.targetMax);

		if (clamped !== radius) {
			updateTerrainSettings(
				(settings) => {
					settings.brush.radius = clamped;
				},
				["brush.radius"]
			);
		}
	}

	/** getTerrainBrushRadiusRange of the target (§4.17), null when the target is not a terrain. */
	private _getRadiusRange(): ITerrainRadiusRange | null {
		const target = this._target;
		if (!target) {
			return null;
		}

		const cache = this._radiusRangeCache;
		if (cache && cache.mesh === target) {
			return cache.range;
		}

		let range: ITerrainRadiusRange | null = null;
		const eligibility = this._getEligibility(target);

		if (eligibility?.eligible) {
			try {
				const info = getTerrainMeshInfo(target);
				const grid = createTerrainGridView(info.subdivisions, info.width, info.height);
				const result = getTerrainBrushRadiusRange(grid, getTerrainMetric(target.computeWorldMatrix(true)));

				if ([result.min, result.max, result.targetMin, result.targetMax].every((value) => Number.isFinite(value) && value > 0)) {
					range = { min: result.min, max: result.max, targetMin: result.targetMin, targetMax: result.targetMax };
				}
			} catch (e) {
				this._reportError(e);
			}
		}

		this._radiusRangeCache = { mesh: target, range };
		return range;
	}

	private _loadTargetWeights(): void {
		const target = this._target;
		if (!target) {
			return;
		}

		// Weights load on demand when the tab targets a terrain (hidden terrains included, §1.16).
		const plugin = getTerrainPlugin(target);
		plugin
			?.whenWeightMapsReadyAsync()
			.then(() => this._safe(() => this._updateStatus()))
			.catch(() => {
				// The weights error is shown by the banner and the refusal.
			});
	}

	private _pickTarget(ray: Ray, solidHoles: boolean, wantOther: boolean): ITerrainPickResult {
		const target = this._target;
		const targetHit = target ? pickTerrain(this._editor.layout.preview.scene, ray, { mesh: target, solidHoles }) : null;
		const blocking = terrainSettings.view.otherGroundsBlockBrush;

		let other: ITerrainPick | null = null;
		if ((targetHit && blocking) || (!targetHit && wantOther)) {
			const nearest = pickTerrain(this._editor.layout.preview.scene, ray, { eligibleOnly: true });
			if (nearest && nearest.mesh !== target) {
				other = nearest;
			}
		}

		// Target-first picking (§1.15): other terrains block the brush only when the view option asks for it.
		if (targetHit && other && blocking && other.distance < targetHit.distance) {
			return { target: null, other };
		}

		return { target: targetHit, other: targetHit ? null : other };
	}

	private _getEligibility(mesh: Mesh): TerrainEligibility | null {
		try {
			return getTerrainEligibility(mesh);
		} catch (e) {
			this._reportError(e);
			return null;
		}
	}

	/** tabActive() of §1.15: tab root visible, not playing, preview rendering. */
	private _isTabActive(): boolean {
		const preview = this._getPreview();
		if (!preview?.scene || !this._isRootVisible()) {
			return false;
		}

		const play = preview.play;
		if (play?.state?.playing || play?.scene) {
			return false;
		}

		return preview.renderScene !== false;
	}

	/** canEdit() of §1.15. */
	private _canEdit(): boolean {
		const target = this._target;
		if (!target || !this._isTabActive() || terrainSettings.category === "settings" || this._navigateMode || target.isDisposed()) {
			return false;
		}

		const eligibility = this._getEligibility(target);
		return !!eligibility?.eligible && !eligibility.readOnly;
	}

	private _isRootVisible(): boolean {
		const root = this._options.rootElement;
		return !root || root.offsetParent !== null;
	}

	private _isShortcutContext(): boolean {
		const ownerDocument = this._getDocument();
		const root = this._options.rootElement;

		let dialogOpen = false;
		let activeElement: Element | null = null;

		try {
			dialogOpen = !!ownerDocument?.querySelector('[role="dialog"], [role="alertdialog"]');
			activeElement = ownerDocument?.activeElement ?? null;
		} catch (e) {
			dialogOpen = false;
		}

		return isTerrainShortcutContext({
			tabVisible: this._isRootVisible(),
			dialogOpen,
			textInputFocused: isTerrainTextInputElement(activeElement as HTMLInputElement | null),
			pointerOverCanvas: this._pointerOverCanvas,
			focusInTab: !!root && !!activeElement && root.contains(activeElement),
		});
	}

	private _getCameraKeyCodes(): number[] {
		const preview = this._getPreview();
		const codes = getTerrainCameraKeyCodes(preview?.camera as ITerrainCameraKeys | undefined);

		for (const code of getTerrainCameraKeyCodes(preview?.scene?.activeCamera as ITerrainCameraKeys | null | undefined)) {
			if (!codes.includes(code)) {
				codes.push(code);
			}
		}

		return codes;
	}

	private _getPreview(): EditorPreview | null {
		return this._editor.layout?.preview ?? null;
	}

	/**
	 * Converts a client point (CSS px) to render pixels through the object-contain transform of the preview canvas: in the fixed dimensions
	 * modes (720p, 1080p, 4k) the rendered image is letterboxed inside the canvas element. Null over the letterbox bars or outside the canvas.
	 */
	private _getRenderPointerPosition(clientX: number, clientY: number): { x: number; y: number } | null {
		const canvas = this._getPreview()?.canvas;
		if (!canvas) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		const renderWidth = canvas.width;
		const renderHeight = canvas.height;

		if (!renderWidth || !renderHeight || !rect.width || !rect.height) {
			return null;
		}

		const scale = Math.min(rect.width / renderWidth, rect.height / renderHeight);
		const x = (clientX - rect.left - (rect.width - renderWidth * scale) * 0.5) / scale;
		const y = (clientY - rect.top - (rect.height - renderHeight * scale) * 0.5) / scale;

		if (x < 0 || y < 0 || x > renderWidth || y > renderHeight) {
			return null;
		}

		return { x, y };
	}

	/**
	 * Picking ray of the active camera through a client point (CSS px): null over the letterbox bars, outside the canvas or without camera.
	 */
	private _createPickingRay(clientX: number, clientY: number): Ray | null {
		const preview = this._getPreview();
		const position = this._getRenderPointerPosition(clientX, clientY);
		const camera = preview?.scene?.activeCamera;

		if (!preview || !position || !camera) {
			return null;
		}

		// createPickingRay divides the coordinates by the hardware scaling level: the ray goes through render pixel (x, y).
		const hardwareScalingLevel = preview.engine.getHardwareScalingLevel();
		return preview.scene.createPickingRay(position.x * hardwareScalingLevel, position.y * hardwareScalingLevel, Matrix.Identity(), camera);
	}

	private _getDocument(): Document | null {
		const root = this._options.rootElement;
		if (root?.ownerDocument) {
			return root.ownerDocument;
		}

		return typeof document !== "undefined" ? document : null;
	}

	private _addListener(bindings: ITerrainListenerBinding[], target: EventTarget, type: string, listener: (event: Event) => void): void {
		target.addEventListener(type, listener);
		bindings.push({ target, type, listener });
	}

	private _removeListeners(bindings: ITerrainListenerBinding[]): void {
		for (const binding of bindings) {
			this._safe(() => binding.target.removeEventListener(binding.type, binding.listener));
		}
	}

	private _safe(callback: () => void): void {
		try {
			callback();
		} catch (e) {
			this._reportError(e);
		}
	}

	/** Editor console + one toast.error("Terrain tool error: …") per message and 5 s (§1.2). */
	private _reportError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		const now = getTerrainNowMs();
		const last = reportedTerrainViewportErrors.get(message);

		if (last !== undefined && now - last < TERRAIN_ERROR_DEDUPE_MS) {
			return;
		}

		reportedTerrainViewportErrors.set(message, now);

		try {
			this._editor.layout?.console?.error(`Terrain tool error: ${message}`);
		} catch (e) {
			// The console may not exist (tests, early mount).
		}

		console.error(error);

		try {
			toast.error(`Terrain tool error: ${message}`);
		} catch (e) {
			// Catch silently.
		}
	}
}

function isTerrainPaintTool(tool: TerrainTool): boolean {
	return (TERRAIN_PAINT_TOOLS as readonly string[]).includes(tool);
}

function createTerrainRoundShape(base: { falloff: ITerrainBrushShape["falloff"]; hardness: number; edgeFalloff: boolean }): ITerrainBrushShape {
	return { id: "builtin:round", kind: "round", mask: null, falloff: base.falloff, hardness: base.hardness, edgeFalloff: base.edgeFalloff };
}

/** ITerrainGrid of the §4.1 formulas from the grid size (the radius range reads cellX, cellZ, width and height). */
function createTerrainGridView(subdivisions: number, width: number, height: number): ITerrainGrid {
	const cellX = width / subdivisions;
	const cellZ = height / subdivisions;

	return {
		subdivisions,
		columns: subdivisions + 1,
		rows: subdivisions + 1,
		width,
		height,
		cellX,
		cellZ,
		signature: `${subdivisions}:${width}:${height}`,
		vertexIndex: (col: number, row: number) => row * (subdivisions + 1) + col,
		localX: (col: number) => col * cellX - width * 0.5,
		localZ: (row: number) => height * 0.5 - row * cellZ,
		colOf: (x: number) => (x + width * 0.5) / cellX,
		rowOf: (z: number) => (height * 0.5 - z) / cellZ,
	};
}

/** World lengths of the local unit axes from the rows of the world matrix (§4.1). */
function getTerrainMetric(matrix: Matrix): ITerrainMetric {
	const m = matrix.m;

	return {
		sx: Math.hypot(m[0], m[1], m[2]),
		sy: Math.hypot(m[4], m[5], m[6]),
		sz: Math.hypot(m[8], m[9], m[10]),
	};
}

/** Changes when the active camera moves or its projection changes (keyboard flight with a still pointer). */
function getTerrainCameraKey(scene: Scene | null): string {
	const camera = scene?.activeCamera;
	if (!camera) {
		return "";
	}

	return `${camera.uniqueId}|${camera.getViewMatrix().updateFlag}|${camera.getProjectionMatrix().updateFlag}`;
}

function isSameTerrainViewportStatus(a: ITerrainViewportStatus, b: ITerrainViewportStatus): boolean {
	// Hover moves over the same mesh are not reported (status.hover is always current): the tab would re-render at every move.
	return (
		a.canEdit === b.canEdit &&
		a.message === b.message &&
		a.strokeActive === b.strokeActive &&
		a.navigateMode === b.navigateMode &&
		a.captureArmed === b.captureArmed &&
		a.predictedRefusal === b.predictedRefusal &&
		(a.hover?.mesh ?? null) === (b.hover?.mesh ?? null)
	);
}

function getTerrainOverlayLabel(overlay: string): string {
	switch (overlay) {
		case "layer-weights":
			return "Layer weights";
		case "active-layer":
			return "Active layer";
		case "contours":
			return "Contours";
		case "slope":
			return "Slope";
		case "grid":
			return "Vertex grid";
		default:
			return "None";
	}
}

/** "Captured {n}" with the first n not used by the library. */
function getTerrainCaptureName(names: string[]): string {
	let index = 1;
	while (names.includes(`Captured ${index}`)) {
		++index;
	}

	return `Captured ${index}`;
}

function createTerrainStrokeSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}

function getTerrainNowMs(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function toTerrainRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function wrapTerrainDegrees(degrees: number): number {
	let value = ((((degrees + 180) % 360) + 360) % 360) - 180;
	if (value === -180 && degrees > 0) {
		value = 180;
	}

	return roundTerrainValue(value, 2);
}

function roundTerrainValue(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
