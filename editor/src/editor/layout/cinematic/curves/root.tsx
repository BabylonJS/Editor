import { Component, PointerEvent, ReactNode, MouseEvent } from "react";

import { ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isDomTextInputFocused } from "../../../../tools/dom";
import { isColor3, isColor4 } from "../../../../tools/guards/math";

import { CinematicEditor } from "../editor";

import {
	applyKeyTangentMode,
	CinematicCurveComponent,
	CinematicCurveKey,
	CinematicCurveSide,
	CinematicCurveTangentMode,
	getComponentValue,
	getCurveComponents,
	getCurveKeyFrame,
	getCurveSegment,
	getCurveSegmentRange,
	getInKey,
	getKeySlope,
	getOutKey,
	getTrackCurveKeys,
	ICinematicCurveKeysSnapshot,
	insertCurveKey,
	isHermiteSegment,
	isKeyTangentLinked,
	restoreCurveKeys,
	setCurveKeyFrame,
	setKeySlope,
	setKeyTangentLinked,
	snapshotCurveKeys,
} from "./tools/keys";
import {
	fitCurvesView,
	formatCurvesValue,
	frameToX,
	getCurvesTickStep,
	ICinematicEditorCurvesBounds,
	ICinematicEditorCurvesView,
	lerpCurvesView,
	valueToY,
	xToFrame,
	zoomCurvesView,
} from "./tools/view";

import { CinematicEditorCurvesCut } from "./cut";
import { CinematicEditorCurvesGrid } from "./grid";
import { CinematicEditorCurvePath } from "./curve";
import { CinematicEditorCurvePoint } from "./point";
import { CinematicEditorCurveHandle } from "./handle";
import { CinematicEditorCurvesToolbar } from "./toolbar";
import { CinematicEditorCurvesContextMenu } from "./context-menu";

export interface ICinematicEditorCurvesRootProps {
	view: ICinematicEditorCurvesView;
	cinematicEditor: CinematicEditor;
	onViewChange: (view: ICinematicEditorCurvesView) => void;
}

export interface ICinematicEditorCurvesRootState {
	width: number;
	height: number;

	box: { x0: number; y0: number; x1: number; y1: number } | null;
	tooltip: { x: number; y: number; text: string } | null;

	contextTarget: ICinematicEditorCurvesTarget | null;
	contextPosition: { x: number; y: number } | null;
}

interface ICinematicEditorCurvesTarget {
	type: "point" | "handle" | "curve";
	keyIndex: number;
	component: CinematicCurveComponent;
	side: CinematicCurveSide | null;
}

type CinematicEditorCurvesInteraction =
	| { type: "pan"; pointerId: number; startX: number; startY: number; startView: ICinematicEditorCurvesView }
	| { type: "scrub"; pointerId: number; startX: number; moved: boolean; clearSelection: boolean }
	| { type: "box"; pointerId: number; startX: number; startY: number; initialSelection: Set<CinematicCurveKey> }
	| {
			type: "keys";
			pointerId: number;
			startX: number;
			startY: number;
			moved: boolean;
			keys: CinematicCurveKey[];
			key: CinematicCurveKey;
			component: CinematicCurveComponent;
			side: CinematicCurveSide | null;
			deselectOnClick: boolean;
			selectOnlyOnClick: boolean;
			before: ICinematicCurveKeysSnapshot;
	  }
	| {
			type: "tangent";
			pointerId: number;
			startX: number;
			startY: number;
			moved: boolean;
			keys: CinematicCurveKey[];
			keyIndex: number;
			component: CinematicCurveComponent;
			side: CinematicCurveSide;
			linked: boolean;
			/**
			 * Offset from the pointer to the tip of the handle when it was grabbed, so the handle doesn't jump when grabbed off-center.
			 */
			offsetX: number;
			offsetY: number;
			before: ICinematicCurveKeysSnapshot;
	  };

/**
 * Height of the band on top of the graph showing the frames, where the time is scrubbed.
 */
const rulerHeight = 32;
/**
 * Length, in pixels, of the tangent handles.
 */
const handleLength = 80;
/**
 * Space kept around the curves when they are framed: room for the values on the left, the ruler on top and the toolbar at the bottom.
 */
const framePadding = { left: 56, right: 40, top: rulerHeight + 28, bottom: 64 };
/**
 * Distance, in pixels, the pointer must move before a press becomes a drag.
 */
const dragThreshold = 3;
const viewAnimationDuration = 220;

const componentColors: Record<string, string> = {
	x: "#f05252",
	y: "#31c48d",
	z: "#4b8cf5",
	w: "#c084fc",
	r: "#f05252",
	g: "#31c48d",
	b: "#4b8cf5",
	a: "#c084fc",
};

export class CinematicEditorCurvesRoot extends Component<ICinematicEditorCurvesRootProps, ICinematicEditorCurvesRootState> {
	private _containerRef: HTMLDivElement | null = null;
	private _svgRef: SVGSVGElement | null = null;
	private _resizeObserver: ResizeObserver | null = null;

	private _interaction: CinematicEditorCurvesInteraction | null = null;
	private _selection: Set<CinematicCurveKey> = new Set();
	private _hiddenComponents: Set<string> = new Set();
	private _editType: string | null = null;

	private _hovered: boolean = false;
	private _autoFit: boolean = true;
	private _fittedTrack: ICinematicTrack | null = null;

	private _pendingView: ICinematicEditorCurvesView | null = null;
	private _pendingViewFrame: number | null = null;
	private _viewAnimationFrame: number | null = null;
	private _previewFrame: number | null = null;
	private _trackpadUntil: number = 0;

	private _wheelListener: ((event: WheelEvent) => void) | null = null;
	private _keyDownListener: ((event: KeyboardEvent) => void) | null = null;

	public constructor(props: ICinematicEditorCurvesRootProps) {
		super(props);

		this.state = {
			width: 0,
			height: 0,
			box: null,
			tooltip: null,
			contextTarget: null,
			contextPosition: null,
		};
	}

	public render(): ReactNode {
		const track = this.props.cinematicEditor.state.selectedTrack;
		const keys = track ? getTrackCurveKeys(track) : null;
		const components = keys?.length ? getCurveComponents(getInKey(keys[0]).value) : null;

		const drawable = keys && components && keys.length > 0 ? keys : null;
		if (drawable) {
			this._pruneSelection(drawable);
		}

		return (
			<div
				ref={(r) => this._setContainerRef(r)}
				className="relative w-full h-full overflow-hidden select-none"
				onPointerEnter={() => (this._hovered = true)}
				onPointerLeave={() => (this._hovered = false)}
			>
				<ContextMenu onOpenChange={(open) => !open && this.setState({ contextTarget: null })}>
					<ContextMenuTrigger asChild>
						<svg
							ref={(r) => (this._svgRef = r)}
							className="absolute inset-0 w-full h-full outline-none"
							onPointerDown={(ev) => this._handlePointerDown(ev)}
							onPointerMove={(ev) => this._handlePointerMove(ev)}
							onPointerUp={(ev) => this._handlePointerUp(ev)}
							onPointerCancel={(ev) => this._handlePointerUp(ev)}
							onDoubleClick={(ev) => this._handleDoubleClick(ev)}
							onContextMenu={(ev) => this._handleContextMenu(ev)}
						>
							<CinematicEditorCurvesGrid view={this.props.view} width={this.state.width} height={this.state.height} rulerHeight={rulerHeight} />
							{track?.animationGroups && this._getAnimationGroupsGhosts(track)}
							{drawable && this._getCuts(drawable)}
							{drawable && components && this._getCurves(drawable, components)}
							{this._getSelectionBox()}
						</svg>
					</ContextMenuTrigger>
					<ContextMenuContent>{track && this._getContextMenu(track, drawable)}</ContextMenuContent>
				</ContextMenu>

				{this._getTooltip()}

				<CinematicEditorCurvesToolbar
					components={(components ?? []).filter((component) => component !== null) as string[]}
					hiddenComponents={this._hiddenComponents}
					selection={drawable ? drawable.filter((key) => this._selection.has(key)) : []}
					onToggleComponent={(component) => this._toggleComponent(component)}
					onApplyTangentMode={(mode) => this._applyTangentMode(mode)}
					onSetTangentsLinked={(linked) => this._setTangentsLinked(linked)}
					onFrame={() => this.frameSelection()}
				/>
			</div>
		);
	}

	public componentDidMount(): void {
		// Listened natively: React listens to wheel events as passive and they couldn't be prevented.
		this._containerRef?.addEventListener("wheel", (this._wheelListener = (event) => this._handleWheel(event)), { passive: false });

		window.addEventListener("keydown", (this._keyDownListener = (event) => this._handleKeyDown(event)));
	}

	public componentDidUpdate(): void {
		const track = this.props.cinematicEditor.state.selectedTrack;
		const editType = this.props.cinematicEditor.state.editType;

		if (editType !== this._editType) {
			this._editType = editType;

			if (editType === "curves") {
				this._selectInspectorKey();
			}
		}

		const visible = editType === "curves" && this.state.width > 0 && this.state.height > 0;
		if (!visible || track === this._fittedTrack) {
			return;
		}

		// A new track is framed: the first time instantly, then with a transition.
		const animate = this._fittedTrack !== null;

		this._fittedTrack = track;
		this._selection.clear();
		this._selectInspectorKey();

		if (track) {
			this.frameAll(animate);
		}
	}

	public componentWillUnmount(): void {
		this._resizeObserver?.disconnect();

		if (this._wheelListener) {
			this._containerRef?.removeEventListener("wheel", this._wheelListener);
		}

		if (this._keyDownListener) {
			window.removeEventListener("keydown", this._keyDownListener);
		}

		[this._pendingViewFrame, this._viewAnimationFrame, this._previewFrame].forEach((frame) => {
			if (frame !== null) {
				cancelAnimationFrame(frame);
			}
		});
	}

	/**
	 * Frames all the visible curves of the selected track.
	 */
	public frameAll(animate: boolean = true): void {
		this._frame(false, animate);
	}

	/**
	 * Frames the selected keys, or all the curves if no key is selected.
	 */
	public frameSelection(animate: boolean = true): void {
		this._frame(this._selection.size > 0, animate);
	}

	private _setContainerRef(ref: HTMLDivElement | null): void {
		if (ref === this._containerRef) {
			return;
		}

		this._containerRef = ref;
		this._resizeObserver?.disconnect();

		if (!ref) {
			return;
		}

		this._resizeObserver = new ResizeObserver(() => {
			const width = ref.clientWidth;
			const height = ref.clientHeight;

			if (width === this.state.width && height === this.state.height) {
				return;
			}

			this.setState({ width, height }, () => {
				if (this._autoFit && this._fittedTrack && width > 0 && height > 0) {
					this.frameAll(false);
				}
			});
		});

		this._resizeObserver.observe(ref);
	}

	private get _view(): ICinematicEditorCurvesView {
		return this._pendingView ?? this.props.view;
	}

	/**
	 * Sets the view at the next animation frame so successive events (wheel, trackpad) don't render more than once a frame.
	 */
	private _setView(view: ICinematicEditorCurvesView): void {
		this._pendingView = view;

		this._pendingViewFrame ??= requestAnimationFrame(() => {
			this._pendingViewFrame = null;

			if (this._pendingView) {
				const pendingView = this._pendingView;
				this._pendingView = null;
				this.props.onViewChange(pendingView);
			}
		});
	}

	/**
	 * Called when the user navigates by hand: the view is no longer framed automatically.
	 */
	private _navigate(view: ICinematicEditorCurvesView): void {
		this._autoFit = false;
		this._stopViewAnimation();
		this._setView(view);
	}

	private _stopViewAnimation(): void {
		if (this._viewAnimationFrame !== null) {
			cancelAnimationFrame(this._viewAnimationFrame);
			this._viewAnimationFrame = null;
		}
	}

	private _animateView(target: ICinematicEditorCurvesView): void {
		this._stopViewAnimation();

		const from = this._view;
		const start = performance.now();

		const step = (): void => {
			const amount = Math.min(1, (performance.now() - start) / viewAnimationDuration);
			const eased = 1 - Math.pow(1 - amount, 3);

			this.props.onViewChange(lerpCurvesView(from, target, eased, this.state.width, this.state.height));
			this._viewAnimationFrame = amount < 1 ? requestAnimationFrame(step) : null;
		};

		this._viewAnimationFrame = requestAnimationFrame(step);
	}

	private _frame(selectionOnly: boolean, animate: boolean): void {
		const track = this.props.cinematicEditor.state.selectedTrack;
		const keys = track ? getTrackCurveKeys(track) : null;

		if (!keys?.length || this.state.width <= 0 || this.state.height <= 0) {
			return;
		}

		const bounds = this._getBounds(keys, selectionOnly);
		if (!bounds) {
			return;
		}

		this._autoFit = !selectionOnly;

		const view = fitCurvesView(bounds, this.state.width, this.state.height, framePadding);

		if (animate) {
			this._animateView(view);
		} else {
			this._stopViewAnimation();
			this._pendingView = null;
			this.props.onViewChange(view);
		}
	}

	private _getVisibleComponents(keys: CinematicCurveKey[]): CinematicCurveComponent[] {
		const components = getCurveComponents(getInKey(keys[0]).value) ?? [];
		return components.filter((component) => component === null || !this._hiddenComponents.has(component));
	}

	/**
	 * Returns the frames and values covered by the visible curves (or only by the selected keys), overshoots of the tangents included.
	 */
	private _getBounds(keys: CinematicCurveKey[], selectionOnly: boolean): ICinematicEditorCurvesBounds | null {
		const components = this._getVisibleComponents(keys);
		if (!components.length) {
			return null;
		}

		const bounds: ICinematicEditorCurvesBounds = {
			minFrame: Infinity,
			maxFrame: -Infinity,
			minValue: Infinity,
			maxValue: -Infinity,
		};

		const addValue = (value: number): void => {
			bounds.minValue = Math.min(bounds.minValue, value);
			bounds.maxValue = Math.max(bounds.maxValue, value);
		};

		keys.forEach((key, index) => {
			if (selectionOnly && !this._selection.has(key)) {
				return;
			}

			const frame = getCurveKeyFrame(key);
			bounds.minFrame = Math.min(bounds.minFrame, frame);
			bounds.maxFrame = Math.max(bounds.maxFrame, frame);

			components.forEach((component) => {
				addValue(getComponentValue(getInKey(key).value, component));
				addValue(getComponentValue(getOutKey(key).value, component));

				if (index < keys.length - 1 && (!selectionOnly || this._selection.has(keys[index + 1]))) {
					getCurveSegmentRange(getCurveSegment(keys, index, component)).forEach((value) => addValue(value));
				}
			});
		});

		return bounds.minFrame === Infinity ? null : bounds;
	}

	/**
	 * Removes from the selection the keys that are no longer in the track (removed, undone, etc.).
	 */
	private _pruneSelection(keys: CinematicCurveKey[]): void {
		this._selection.forEach((key) => {
			if (!keys.includes(key)) {
				this._selection.delete(key);
			}
		});
	}

	/**
	 * Selects the key edited in the inspector, which can be selected in the timelines before showing the curves.
	 */
	private _selectInspectorKey(): void {
		const keys = this._getEditedKeys();
		const editedObject = this.props.cinematicEditor.inspector?.state.editedObject;

		if (keys?.includes(editedObject)) {
			this._selection = new Set([editedObject]);
			this.forceUpdate();
		}
	}

	private _setSelection(keys: Iterable<CinematicCurveKey>, primary?: CinematicCurveKey | null): void {
		this._selection = new Set(keys);

		const track = this.props.cinematicEditor.state.selectedTrack;
		const inspector = this.props.cinematicEditor.inspector;

		if (primary === undefined) {
			primary = this._selection.size ? Array.from(this._selection).pop()! : null;
		}

		if (track && inspector.state.editedObject !== primary) {
			inspector.setEditedObject(primary, track);
		}

		this.forceUpdate();
	}

	private _getLocalPosition(event: { clientX: number; clientY: number }): { x: number; y: number } {
		const rect = this._svgRef!.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
	}

	/**
	 * Returns the point, handle or curve under the pointer of the given event. The element is searched at the position of
	 * the pointer as events following a captured press (click, double-click) target the captured element.
	 */
	private _getTarget(event: { clientX: number; clientY: number }): ICinematicEditorCurvesTarget | null {
		const element = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-curve-target]");
		if (!element || !this._svgRef?.contains(element)) {
			return null;
		}

		const component = element.getAttribute("data-component");

		return {
			type: element.getAttribute("data-curve-target") as ICinematicEditorCurvesTarget["type"],
			keyIndex: parseInt(element.getAttribute("data-key-index") ?? "-1"),
			component: component === "-" || component === null ? null : component,
			side: (element.getAttribute("data-side") || null) as CinematicCurveSide | null,
		};
	}

	private _getEditedKeys(): CinematicCurveKey[] | null {
		const track = this.props.cinematicEditor.state.selectedTrack;
		return track ? getTrackCurveKeys(track) : null;
	}

	private _handlePointerDown(event: PointerEvent<SVGSVGElement>): void {
		if (this._interaction || !this._svgRef) {
			return;
		}

		const { x, y } = this._getLocalPosition(event);
		const target = this._getTarget(event);
		const keys = this._getEditedKeys();

		if (event.button === 1 || (event.button === 0 && event.altKey && target?.type !== "handle")) {
			event.preventDefault();
			this._startInteraction(event, { type: "pan", pointerId: event.pointerId, startX: x, startY: y, startView: this._view });
			document.body.style.cursor = "grabbing";
			return;
		}

		if (event.button !== 0) {
			return;
		}

		if (keys && target?.type === "handle") {
			const key = keys[target.keyIndex];
			if (!key) {
				return;
			}

			const before = snapshotCurveKeys(keys);
			const linked = !event.altKey && isKeyTangentLinked(key);

			// The link is stored once the tangents are edited: creating the tangents of a straight segment can make
			// them differ on the components that aren't edited, which must not break the key. Alt + drag breaks the
			// tangents of the key, like in most animation software.
			if (!isCinematicKeyCut(key)) {
				key.lockedTangent = linked;
			}

			const side = target.side ?? "out";
			const handle = getHandlePosition(this._view, keys, target.keyIndex, side, target.component);

			this._startInteraction(event, {
				type: "tangent",
				pointerId: event.pointerId,
				startX: x,
				startY: y,
				moved: false,
				keys,
				keyIndex: target.keyIndex,
				component: target.component,
				side,
				linked,
				offsetX: handle.tipX - x,
				offsetY: handle.tipY - y,
				before,
			});
			return;
		}

		if (keys && target?.type === "point") {
			const key = keys[target.keyIndex];
			if (!key) {
				return;
			}

			const additive = event.shiftKey || event.metaKey || event.ctrlKey;
			const wasSelected = this._selection.has(key);

			if (additive) {
				if (!wasSelected) {
					this._setSelection([...this._selection, key], key);
				}
			} else if (!wasSelected) {
				this._setSelection([key], key);
			} else {
				this._setSelection(this._selection, key);
			}

			this._startInteraction(event, {
				type: "keys",
				pointerId: event.pointerId,
				startX: x,
				startY: y,
				moved: false,
				keys,
				key,
				component: target.component,
				side: target.side,
				deselectOnClick: additive && wasSelected,
				selectOnlyOnClick: !additive && wasSelected && this._selection.size > 1,
				before: snapshotCurveKeys(keys),
			});
			return;
		}

		if (y > rulerHeight && (event.shiftKey || event.metaKey || event.ctrlKey)) {
			this._startInteraction(event, {
				type: "box",
				pointerId: event.pointerId,
				startX: x,
				startY: y,
				initialSelection: new Set(this._selection),
			});
			return;
		}

		// Scrubbing the time, anywhere on the graph like before or on the ruler.
		this._startInteraction(event, { type: "scrub", pointerId: event.pointerId, startX: x, moved: false, clearSelection: y > rulerHeight });

		this.props.cinematicEditor.createTemporaryAnimationGroup();
		this.props.cinematicEditor.setCurrentTime(this._getFrameAt(x));

		document.body.style.cursor = "ew-resize";
	}

	private _startInteraction(event: PointerEvent<SVGSVGElement>, interaction: CinematicEditorCurvesInteraction): void {
		this._interaction = interaction;
		this._stopViewAnimation();
		this._svgRef?.setPointerCapture(event.pointerId);
	}

	private _getFrameAt(x: number): number {
		return Math.max(0, Math.round(xToFrame(this._view, x)));
	}

	private _handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
		const interaction = this._interaction;
		if (!interaction || interaction.pointerId !== event.pointerId) {
			return;
		}

		const { x, y } = this._getLocalPosition(event);

		switch (interaction.type) {
			case "pan":
				this._navigate({
					...interaction.startView,
					panX: interaction.startView.panX + (x - interaction.startX),
					panY: interaction.startView.panY + (y - interaction.startY),
				});
				break;

			case "scrub":
				if (!interaction.moved && Math.abs(x - interaction.startX) < dragThreshold) {
					return;
				}

				interaction.moved = true;
				this.props.cinematicEditor.setCurrentTime(this._getFrameAt(x));
				break;

			case "box":
				this._updateBoxSelection(interaction, x, y);
				break;

			case "keys":
				this._moveKeys(interaction, x, y, event.shiftKey);
				break;

			case "tangent":
				this._moveTangent(interaction, x, y);
				break;
		}
	}

	private _handlePointerUp(event: PointerEvent<SVGSVGElement>): void {
		const interaction = this._interaction;
		if (!interaction || interaction.pointerId !== event.pointerId) {
			return;
		}

		this._interaction = null;
		this._svgRef?.releasePointerCapture(event.pointerId);
		document.body.style.cursor = "";

		switch (interaction.type) {
			case "scrub":
				this.props.cinematicEditor.disposeTemporaryAnimationGroup();

				if (!interaction.moved && interaction.clearSelection && this._selection.size) {
					this._setSelection([], null);
				}
				break;

			case "box":
				this.setState({ box: null });
				this._setSelection(this._selection);
				break;

			case "keys":
				if (interaction.moved) {
					this._commitKeysEdit(interaction.keys, interaction.before);
				} else if (interaction.deselectOnClick) {
					this._setSelection(
						Array.from(this._selection).filter((key) => key !== interaction.key),
						undefined
					);
				} else if (interaction.selectOnlyOnClick) {
					this._setSelection([interaction.key], interaction.key);
				}
				break;

			case "tangent":
				if (interaction.moved) {
					this._commitKeysEdit(interaction.keys, interaction.before);
				} else {
					// Nothing was edited: forget the link stored when the handle was pressed.
					restoreCurveKeys(interaction.keys, interaction.before);
					this.forceUpdate();
				}
				break;
		}

		if (this.state.tooltip) {
			this.setState({ tooltip: null });
		}
	}

	private _updateBoxSelection(interaction: Extract<CinematicEditorCurvesInteraction, { type: "box" }>, x: number, y: number): void {
		const box = {
			x0: Math.min(interaction.startX, x),
			y0: Math.min(interaction.startY, y),
			x1: Math.max(interaction.startX, x),
			y1: Math.max(interaction.startY, y),
		};

		const keys = this._getEditedKeys();
		const selection = new Set(interaction.initialSelection);

		if (keys?.length) {
			const view = this._view;
			const components = this._getVisibleComponents(keys);

			keys.forEach((key) => {
				const px = frameToX(view, getCurveKeyFrame(key));
				if (px < box.x0 || px > box.x1) {
					return;
				}

				const inside = components.some((component) => {
					return [getInKey(key), getOutKey(key)].some((animationKey) => {
						const py = valueToY(view, getComponentValue(animationKey.value, component));
						return py >= box.y0 && py <= box.y1;
					});
				});

				if (inside) {
					selection.add(key);
				}
			});
		}

		this._selection = selection;
		this.setState({ box });
	}

	private _moveKeys(interaction: Extract<CinematicEditorCurvesInteraction, { type: "keys" }>, x: number, y: number, constrain: boolean): void {
		const dx = x - interaction.startX;
		const dy = y - interaction.startY;

		if (!interaction.moved && Math.hypot(dx, dy) < dragThreshold) {
			return;
		}

		if (!interaction.moved) {
			interaction.moved = true;
			// The preview is generated again so it contains keys added since it was generated.
			this.props.cinematicEditor.disposeTemporaryAnimationGroup();
			document.body.style.cursor = "grabbing";
		}

		const view = this._view;
		const keys = interaction.keys;
		const startKeys = interaction.before.keys;
		const startData = interaction.before.data;

		let frameOffset = Math.round(dx / view.zoomX);
		let valueOffset = -dy / view.zoomY;

		// Shift constrains the move to the dominant direction: timing only or values only.
		if (constrain) {
			if (Math.abs(dx) > Math.abs(dy)) {
				valueOffset = 0;
			} else {
				frameOffset = 0;
			}
		}

		// Keys never cross the keys that are not moved, and frames stay positive.
		let minOffset = -Infinity;
		let maxOffset = Infinity;

		startKeys.forEach((key, index) => {
			if (!this._selection.has(key)) {
				return;
			}

			const frame = getSnapshotFrame(startData[index]);
			minOffset = Math.max(minOffset, -frame);

			for (let previous = index - 1; previous >= 0; --previous) {
				if (!this._selection.has(startKeys[previous])) {
					minOffset = Math.max(minOffset, getSnapshotFrame(startData[previous]) + 1 - frame);
					break;
				}
			}

			for (let next = index + 1; next < startKeys.length; ++next) {
				if (!this._selection.has(startKeys[next])) {
					maxOffset = Math.min(maxOffset, getSnapshotFrame(startData[next]) - 1 - frame);
					break;
				}
			}
		});

		frameOffset = Math.min(maxOffset, Math.max(minOffset, frameOffset));

		const isColor = isColor3(getInKey(keys[0]).value) || isColor4(getInKey(keys[0]).value);

		startKeys.forEach((key, index) => {
			if (!this._selection.has(key)) {
				return;
			}

			const data = startData[index];
			setCurveKeyFrame(key, getSnapshotFrame(data) + frameOffset);

			const sides: [any, any][] = isCinematicKeyCut(key)
				? key === interaction.key && interaction.side
					? [interaction.side === "in" ? [key.key1, data.key1] : [key.key2, data.key2]]
					: [
							[key.key1, data.key1],
							[key.key2, data.key2],
						]
				: [[key, data]];

			sides.forEach(([animationKey, animationData]) => {
				let value = getComponentValue(animationData.value, interaction.component) + valueOffset;
				if (isColor) {
					value = Math.min(1, Math.max(0, value));
				}

				if (interaction.component === null) {
					animationKey.value = value;
				} else {
					animationKey.value[interaction.component] = value;
				}
			});
		});

		const animationKey = interaction.side === "in" ? getInKey(interaction.key) : getOutKey(interaction.key);
		const step = getCurvesTickStep(view.zoomY, 56);

		this._showTooltip(x, y, `Frame ${getCurveKeyFrame(interaction.key)}  ·  ${formatCurvesValue(getComponentValue(animationKey.value, interaction.component), step / 100)}`);
		this._schedulePreview();
	}

	private _moveTangent(interaction: Extract<CinematicEditorCurvesInteraction, { type: "tangent" }>, x: number, y: number): void {
		if (!interaction.moved && Math.hypot(x - interaction.startX, y - interaction.startY) < dragThreshold) {
			return;
		}

		if (!interaction.moved) {
			interaction.moved = true;
			this.props.cinematicEditor.disposeTemporaryAnimationGroup();
			document.body.style.cursor = "grabbing";
		}

		const view = this._view;
		const keys = interaction.keys;
		const key = keys[interaction.keyIndex];

		const animationKey = interaction.side === "in" ? getInKey(key) : getOutKey(key);
		const keyX = frameToX(view, getCurveKeyFrame(key));
		const keyY = valueToY(view, getComponentValue(animationKey.value, interaction.component));

		// The handle rotates around its key and stays on its side: the slope is the direction from the key to the tip,
		// which follows the pointer with the offset it was grabbed at.
		const tipX = x + interaction.offsetX;
		const tipY = y + interaction.offsetY;

		const horizontal = Math.max(1, interaction.side === "out" ? tipX - keyX : keyX - tipX) / view.zoomX;
		const vertical = (interaction.side === "out" ? keyY - tipY : tipY - keyY) / view.zoomY;
		const slope = vertical / horizontal;

		setKeySlope(keys, interaction.keyIndex, interaction.side, interaction.component, slope);

		if (interaction.linked) {
			setKeySlope(keys, interaction.keyIndex, interaction.side === "in" ? "out" : "in", interaction.component, slope);
		}

		const angle = (Math.atan2(slope * view.zoomY, view.zoomX) * 180) / Math.PI;

		this._showTooltip(x, y, `Slope ${slope.toPrecision(3)}  ·  ${angle.toFixed(1)}°${interaction.linked ? "  ·  linked" : ""}`);
		this._schedulePreview();
	}

	/**
	 * Registers the undo/redo of an edit of the keys made on the curves and updates the other panels.
	 */
	private _commitKeysEdit(keys: CinematicCurveKey[], before: ICinematicCurveKeysSnapshot): void {
		const after = snapshotCurveKeys(keys);
		const cinematicEditor = this.props.cinematicEditor;

		registerUndoRedo({
			undo: () => restoreCurveKeys(keys, before),
			redo: () => restoreCurveKeys(keys, after),
			action: () => {
				cinematicEditor.disposeTemporaryAnimationGroup();
				cinematicEditor.updateTracksAtCurrentTime();
			},
		});

		cinematicEditor.disposeTemporaryAnimationGroup();
		cinematicEditor.updateTracksAtCurrentTime();
		cinematicEditor.forceUpdate();
	}

	/**
	 * Applies the given edit to the keys of the selected track as a single undoable action and returns its result.
	 */
	private _editKeys<T>(edit: (keys: CinematicCurveKey[]) => T): T | null {
		const keys = this._getEditedKeys();
		if (!keys?.length) {
			return null;
		}

		const before = snapshotCurveKeys(keys);
		const result = edit(keys);
		this._commitKeysEdit(keys, before);

		return result;
	}

	/**
	 * Updates the scene at the current time once per frame while editing.
	 */
	private _schedulePreview(): void {
		this.forceUpdate();

		this._previewFrame ??= requestAnimationFrame(() => {
			this._previewFrame = null;
			this.props.cinematicEditor.updateTracksAtCurrentTime();
		});
	}

	private _showTooltip(x: number, y: number, text: string): void {
		this.setState({ tooltip: { x, y, text } });
	}

	private _handleDoubleClick(event: MouseEvent<SVGSVGElement>): void {
		const target = this._getTarget(event);
		const keys = this._getEditedKeys();
		const { x, y } = this._getLocalPosition(event);

		if (keys && target?.type === "point") {
			const key = keys[target.keyIndex];
			if (key) {
				this.props.cinematicEditor.setCurrentTime(getCurveKeyFrame(key));
			}
			return;
		}

		if (keys?.length && target?.type === "curve") {
			return this._insertKey(this._getFrameAt(x));
		}

		if (y > rulerHeight && !target) {
			this.frameAll();
		}
	}

	private _insertKey(frame: number): void {
		const track = this.props.cinematicEditor.state.selectedTrack;
		const keys = this._getEditedKeys();

		if (!track || !keys?.length) {
			return;
		}

		const existing = keys.find((key) => getCurveKeyFrame(key) === frame);
		if (existing) {
			return this._setSelection([existing], existing);
		}

		const inserted = this._editKeys((keys) => insertCurveKey(keys, frame));
		if (inserted) {
			this._setSelection([inserted], inserted);
		}
	}

	private _removeSelectedKeys(): void {
		if (!this._selection.size) {
			return;
		}

		const selection = new Set(this._selection);
		this._selection.clear();

		this._editKeys((keys) => {
			const remaining = keys.filter((key) => !selection.has(key));
			keys.splice(0, keys.length, ...remaining);
		});

		const track = this.props.cinematicEditor.state.selectedTrack;
		if (track) {
			this.props.cinematicEditor.inspector.setEditedObject(null, track);
		}
	}

	private _applyTangentMode(mode: CinematicCurveTangentMode): void {
		const selection = this._selection;

		this._editKeys((keys) => {
			keys.forEach((key, index) => {
				if (selection.has(key)) {
					applyKeyTangentMode(keys, index, mode);
				}
			});
		});
	}

	private _setTangentsLinked(linked: boolean): void {
		const selection = this._selection;

		this._editKeys((keys) => {
			keys.forEach((key, index) => {
				if (selection.has(key)) {
					setKeyTangentLinked(keys, index, linked);
				}
			});
		});
	}

	private _handleContextMenu(event: MouseEvent<SVGSVGElement>): void {
		const target = this._getTarget(event);
		const keys = this._getEditedKeys();

		if (keys && target?.type === "point") {
			const key = keys[target.keyIndex];
			if (key && !this._selection.has(key)) {
				this._setSelection([key], key);
			}
		}

		this.setState({
			contextTarget: target,
			contextPosition: this._getLocalPosition(event),
		});
	}

	private _handleWheel(event: WheelEvent): void {
		if (this.props.cinematicEditor.state.editType !== "curves") {
			return;
		}

		event.preventDefault();

		const { x, y } = this._getLocalPosition(event);
		const now = performance.now();

		// A notch of a mouse wheel scrolls vertically by a large amount at once (lines or about 100 pixels) while
		// trackpads scroll smoothly by small amounts, horizontally too. Once a gesture is recognized as a trackpad
		// scroll, the following events of the gesture (fast flicks and inertia included) are handled the same way.
		const notch = event.deltaMode !== 0 || (event.deltaX === 0 && Math.abs(event.deltaY) >= 50);
		const trackpad = !notch || now < this._trackpadUntil;

		if (!notch) {
			this._trackpadUntil = now + 250;
		}

		const zoom = event.ctrlKey || event.metaKey || !trackpad;

		if (!zoom) {
			const view = this._view;

			return this._navigate({
				...view,
				panX: view.panX - (event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX),
				panY: view.panY - (event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY),
			});
		}

		const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
		const pixels = delta * (event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 800 : 1);

		// Pinch gestures send small deltas: they are amplified to follow the fingers.
		const intensity = event.ctrlKey && Math.abs(pixels) < 50 ? 0.012 : 0.002;
		const factor = Math.min(2, Math.max(0.5, Math.exp(-pixels * intensity)));

		// Shift zooms the time only, Alt the values only.
		const factorX = event.altKey && !event.shiftKey ? 1 : factor;
		const factorY = event.shiftKey && !event.altKey ? 1 : factor;

		this._navigate(zoomCurvesView(this._view, x, y, factorX, factorY));
	}

	private _handleKeyDown(event: KeyboardEvent): void {
		if (!this._hovered || this.props.cinematicEditor.state.editType !== "curves" || isDomTextInputFocused() || event.metaKey || event.ctrlKey) {
			return;
		}

		switch (event.key) {
			case "f":
			case "F":
				event.preventDefault();
				this.frameSelection();
				break;

			case "a":
			case "A":
			case "Home":
				event.preventDefault();
				this.frameAll();
				break;

			case "Delete":
			case "Backspace":
				if (this._selection.size) {
					event.preventDefault();
					this._removeSelectedKeys();
				}
				break;

			case "Escape":
				if (this._selection.size) {
					this._setSelection([], null);
				}
				break;
		}
	}

	private _getCurves(keys: CinematicCurveKey[], allComponents: CinematicCurveComponent[]): ReactNode[] {
		const view = this.props.view;
		const components = allComponents.filter((component) => component === null || !this._hiddenComponents.has(component));

		const curves: ReactNode[] = [];
		const handles: ReactNode[] = [];
		const points: ReactNode[] = [];

		components.forEach((component) => {
			const color = component === null ? "hsl(var(--foreground) / 0.85)" : componentColors[component];

			curves.push(<CinematicEditorCurvePath key={`curve-${component}`} keys={keys} component={component} view={view} width={this.state.width} color={color} />);

			keys.forEach((key, index) => {
				const x = frameToX(view, getCurveKeyFrame(key));
				const selected = this._selection.has(key);
				const cut = isCinematicKeyCut(key);

				const sides: (CinematicCurveSide | null)[] = cut ? ["in", "out"] : [null];
				sides.forEach((side) => {
					const animationKey = side === "out" ? getOutKey(key) : getInKey(key);
					const y = valueToY(view, getComponentValue(animationKey.value, component));

					points.push(
						<CinematicEditorCurvePoint
							key={`point-${component}-${index}-${side}`}
							x={x}
							y={y}
							color={color}
							selected={selected}
							keyIndex={index}
							component={component}
							side={side}
						/>
					);
				});

				if (!selected) {
					return;
				}

				const linked = isKeyTangentLinked(key);

				(["in", "out"] as CinematicCurveSide[]).forEach((side) => {
					const segment = side === "in" ? index - 1 : index;
					if (segment < 0 || segment >= keys.length - 1) {
						return;
					}

					const handle = getHandlePosition(view, keys, index, side, component);

					handles.push(
						<CinematicEditorCurveHandle
							key={`handle-${component}-${index}-${side}`}
							x={handle.x}
							y={handle.y}
							tipX={handle.tipX}
							tipY={handle.tipY}
							color={color}
							keyIndex={index}
							component={component}
							side={side}
							linked={linked}
							defined={isHermiteSegment(keys, segment)}
						/>
					);
				});
			});
		});

		return [...curves, ...handles, ...points];
	}

	private _getCuts(keys: CinematicCurveKey[]): ReactNode[] {
		const view = this.props.view;

		return keys.map((key, index) => {
			const x = frameToX(view, getCurveKeyFrame(key));
			if (!isCinematicKeyCut(key) || x < -20 || x > this.state.width + 20) {
				return null;
			}

			return <CinematicEditorCurvesCut key={`cut-${index}`} x={x} height={this.state.height} selected={this._selection.has(key)} />;
		});
	}

	private _getAnimationGroupsGhosts(track: ICinematicTrack): ReactNode[] {
		const view = this.props.view;

		return (track.animationGroups ?? []).map((animationGroup, index) => {
			const duration = ((animationGroup.endFrame - animationGroup.startFrame) * ((animationGroup.repeatCount ?? 0) + 1)) / Math.abs(animationGroup.speed || 1);
			const x = frameToX(view, animationGroup.frame);

			return (
				<rect
					key={`animation-group-${index}`}
					x={x}
					y={rulerHeight + 4}
					width={Math.max(1, duration * view.zoomX)}
					height={10}
					rx={5}
					className="pointer-events-none"
					style={{ fill: "hsl(var(--foreground) / 0.15)" }}
				/>
			);
		});
	}

	private _getSelectionBox(): ReactNode {
		const box = this.state.box;
		if (!box) {
			return null;
		}

		return (
			<rect
				x={box.x0}
				y={box.y0}
				width={box.x1 - box.x0}
				height={box.y1 - box.y0}
				className="pointer-events-none"
				style={{ fill: "hsl(var(--foreground) / 0.06)", stroke: "hsl(var(--foreground) / 0.5)" }}
				strokeDasharray="4 3"
			/>
		);
	}

	private _getTooltip(): ReactNode {
		const tooltip = this.state.tooltip;
		if (!tooltip) {
			return null;
		}

		return (
			<div
				className="absolute px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none bg-background/90 border border-border text-foreground shadow-md"
				style={{
					left: Math.min(tooltip.x + 14, Math.max(0, this.state.width - 220)),
					top: Math.max(rulerHeight + 4, tooltip.y - 32),
				}}
			>
				{tooltip.text}
			</div>
		);
	}

	private _getContextMenu(track: ICinematicTrack, keys: CinematicCurveKey[] | null): ReactNode {
		const target = this.state.contextTarget;
		const position = this.state.contextPosition;

		return (
			<CinematicEditorCurvesContextMenu
				cinematicEditor={this.props.cinematicEditor}
				track={track}
				keys={keys}
				selection={keys ? keys.filter((key) => this._selection.has(key)) : []}
				clickedKey={keys && target?.type === "point" ? (keys[target.keyIndex] ?? null) : null}
				frame={position ? this._getFrameAt(position.x) : null}
				zoomX={this.props.view.zoomX}
				onInsertKey={(frame) => this._insertKey(frame)}
				onApplyTangentMode={(mode) => this._applyTangentMode(mode)}
				onSetTangentsLinked={(linked) => this._setTangentsLinked(linked)}
				onRemoveKeys={() => this._removeSelectedKeys()}
				onFrameAll={() => this.frameAll()}
			/>
		);
	}

	private _toggleComponent(component: string): void {
		if (this._hiddenComponents.has(component)) {
			this._hiddenComponents.delete(component);
		} else {
			this._hiddenComponents.add(component);
		}

		if (this._autoFit) {
			this.frameAll();
		}

		this.forceUpdate();
	}
}

function getSnapshotFrame(data: any): number {
	return data.key1 ? data.key1.frame : data.frame;
}

/**
 * Returns the position on screen of the given key and of the tip of its tangent handle on the given side. Handles keep
 * the same length on screen and point in the direction of the curve leaving the key on that side.
 */
function getHandlePosition(
	view: ICinematicEditorCurvesView,
	keys: CinematicCurveKey[],
	keyIndex: number,
	side: CinematicCurveSide,
	component: CinematicCurveComponent
): { x: number; y: number; tipX: number; tipY: number } {
	const key = keys[keyIndex];
	const animationKey = side === "in" ? getInKey(key) : getOutKey(key);

	const x = frameToX(view, getCurveKeyFrame(key));
	const y = valueToY(view, getComponentValue(animationKey.value, component));
	const slope = getKeySlope(keys, keyIndex, side, component);

	const dx = side === "out" ? view.zoomX : -view.zoomX;
	const dy = side === "out" ? -slope * view.zoomY : slope * view.zoomY;
	const length = Math.hypot(dx, dy) || 1;

	return { x, y, tipX: x + (dx / length) * handleLength, tipY: y + (dy / length) * handleLength };
}
