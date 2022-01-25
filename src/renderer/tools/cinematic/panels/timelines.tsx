import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";

import { Animation, Color3, Color4, Quaternion, Scalar, Vector2, Vector3 } from "babylonjs";

import { Editor } from "../../../editor/editor";

import { Tools } from "../../../editor/tools/tools";

import { Timeline } from "../editor/timeline";
import { TimeTracker } from "../editor/timebar/time-tracker";
import { TimeMeasure } from "../editor/timebar/time-measure";

import { Cinematic } from "../../../editor/cinematic/cinematic";

import { ICinematicTrack } from "../../../editor/cinematic/base";
import { CinematicTrackType } from "../../../editor/cinematic/track";

import CinematicEditorPlugin from "../index";

export interface ITimelinesProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the reference to the cinematic being edited.
	 */
	cinematic: Cinematic;
	/**
	 * Defines the reference to the cinematic editor base class.
	 */
	cinematicEditor: CinematicEditorPlugin;
}

export interface ITimelinesState {
	/**
	 * Defines the value of the current zoom applied on the timeline.
	 */
	zoom: number;
	/**
	 * Defines the current width of the tool.
	 */
	width: number;
	/**
	 * Defines the current with of the timelines panel.
	 */
	panelWidth: number;

	/**
	 * Defines the list of the tracks nodes.
	 */
	nodes: TreeNodeInfo<ICinematicTrack>[];
}

export class Timelines extends React.Component<ITimelinesProps, ITimelinesState> {
	/**
	 * Defines the reference to the time tracker.
	 */
	public timeTracker: Nullable<TimeTracker> = null;
	/**
	 * Defines the reference to the time measures.
	 */
	public timeMeasure: Nullable<TimeMeasure> = null;

	private _timelines: Timeline[] = [];
	private _mainDiv: Nullable<HTMLDivElement> = null;

	private _moving: boolean = false;

	private _startX: number = 0;
	private _startY: number = 0;

	private _startPositionX: number = 0;
	private _startPositionY: number = 0;

	private _mouseUpEventListener: Nullable<(ev: MouseEvent) => void> = null;
	private _mouseMoveEventListener: Nullable<(ev: MouseEvent) => void> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ITimelinesProps) {
		super(props);

		this.state = {
			zoom: 1,
			nodes: [],
			width: 2000,
			panelWidth: 2000,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
				<div key="time-div" style={{ width: `${this.state.width * 2 * this.state.zoom}px` }}>
					<TimeTracker
						key="time-tracker"
						zoom={this.state.zoom}
						width={this.state.width}
						editor={this.props.editor}
						cinematc={this.props.cinematic}
						ref={(r) => this.timeTracker = r}
						cinematicEditor={this.props.cinematicEditor}
					/>
					<TimeMeasure ref={(r) => this.timeMeasure = r} cinematic={this.props.cinematic} />
				</div>

				<div
					key="main-div"
					ref={(r) => this._mainDiv = r}
					onWheel={(ev) => this._onWheel(ev)}
					onMouseDown={(ev) => this._handleMouseDown(ev)}
					onScroll={(ev) => this._handleTimelineScroll(ev)}
					style={{ height: "calc(100% - 40px)", overflow: "auto" }}
				>
					<div style={{ height: "100%", width: `${this.state.width * 2 * this.state.zoom}px` }}>
						<Tree
							key="tracksTree"
							contents={this.state.nodes}
						/>
					</div>
				</div>
			</div>
		);
	}

	/**
	 * Gets the current value of the scroll top for the main div.
	 */
	public get scrollTop(): number {
		return this._mainDiv?.scrollTop ?? 0;
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		this.refreshTimelines();
	}

	/**
	 * Plays the cinematic.
	 */
	public play(): void {
		this.timeTracker?.play();
	}

	/**
	 * Stops the cinematic.
	 */
	public stop(): void {
		this.timeTracker?.stop();
	}

	/**
	 * Sets the new panel width of the timelines.
	 * @param panelWidth defines the value of the new panel's width.
	 */
	public setPanelWidth(panelWidth: number): void {
		this.setState({ panelWidth }, () => {
			this._updateWidth(this.state.zoom);
			this.timeMeasure?.setState({ panelWidth });
		});
	}

	/**
	 * Refreshes the timelines.
	 */
	public refreshTimelines(): void {
		this._timelines = [];

		this.setState({
			nodes: [
				...this._getCameraTreeNodeData(),
				...this._getContentTreeNodeData(),
			],
		});
	}

	/**
	 * Adds a key frame at the selected frame.
	 */
	public addKeyFrame(trackId?: string, track?: ICinematicTrack): void {
		const frame = this.timeTracker?.state.position ?? null;
		if (frame === null) {
			return;
		}

		if (!trackId || trackId === "cinematic-editor-camera") {
			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.fov);
			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.position);
			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.target);

			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.focusDistance);
			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.fStop);
			this._addKeyFrameForTrack(frame, this.props.cinematic.camera.focalLength);

			this.props.cinematic.tracks.forEach((t) => this._addKeyFrameForTrack(frame, t));
		} else {
			switch (trackId) {
				case "cinematic-editor-camera-fov":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.fov);
					break;
				case "cinematic-editor-camera-position":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.position);
					break;
				case "cinematic-editor-camera-target":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.target);
					break;

				case "cinematic-editor-camera-focus-distance":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.focusDistance);
					break;
				case "cinematic-editor-camera-fstop":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.fStop);
					break;
				case "cinematic-editor-camera-focal-length":
					this._addKeyFrameForTrack(frame, this.props.cinematic.camera.focalLength);
					break;

				default:
					if (track) {
						this._addKeyFrameForTrack(frame, track);
					}
					break;
			}
		}

		this.refreshTimelines();
	}

	/**
	 * Adds a key to the given frame for the given track.
	 */
	private _addKeyFrameForTrack(frame: number, track: ICinematicTrack): void {
		if (track.type !== CinematicTrackType.Property && track.type !== CinematicTrackType.PropertyGroup) {
			return;
		}

		const scene = this.props.editor.scene;
		const trackProperty = track.property ?? track.propertyGroup;
		const nodeId = track.property?.nodeId ?? track.propertyGroup?.nodeIds[0];

		if (!trackProperty || !nodeId) {
			return;
		}

		const object = nodeId === "__editor__scene__" ? scene : scene?.getNodeById(nodeId);
		if (!object) {
			return;
		}

		let value: any;

		switch (trackProperty.animationType) {
			case Animation.ANIMATIONTYPE_FLOAT: value = Tools.GetProperty<number>(object, trackProperty.propertyPath); break;
			default: value = Tools.GetProperty<any>(object, trackProperty.propertyPath)?.clone(); break;
		}

		if ((value ?? null) === null) {
			return;
		}

		const existingKeyFrame = trackProperty.keys.find((k) => k.frame === frame);
		if (existingKeyFrame) {
			existingKeyFrame.value = value;
		} else {
			trackProperty.keys.push({
				frame,
				value,
				inTangent: this._getDefaultTangentFromDataType(trackProperty.animationType),
				outTangent: this._getDefaultTangentFromDataType(trackProperty.animationType),
			});
			trackProperty.keys.sort((a, b) => a.frame - b.frame);
		}
	}

	private _getDefaultTangentFromDataType(dataType: number): any {
		const defaultTangent = 0.001;

		switch (dataType) {
			case Animation.ANIMATIONTYPE_FLOAT: return defaultTangent;

			case Animation.ANIMATIONTYPE_COLOR3: return new Color3(defaultTangent, defaultTangent, defaultTangent);
			case Animation.ANIMATIONTYPE_COLOR4: return new Color4(defaultTangent, defaultTangent, defaultTangent, defaultTangent);

			case Animation.ANIMATIONTYPE_VECTOR2: return new Vector2(defaultTangent, defaultTangent);
			case Animation.ANIMATIONTYPE_VECTOR3: return new Vector3(defaultTangent, defaultTangent, defaultTangent);

			case Animation.ANIMATIONTYPE_QUATERNION: return new Quaternion(defaultTangent, defaultTangent, defaultTangent, defaultTangent);

			default: return undefined;
		}
	}

	/**
	 * Called on the user uses the mouse's wheel.
	 */
	private _onWheel(ev: React.WheelEvent<HTMLDivElement>): void {
		if (!ev.shiftKey) {
			return;
		}

		ev.preventDefault();

		const oldZoom = this.state.zoom;
		const zoom = Scalar.Clamp(oldZoom - ev.deltaY * 0.05, 1, 10);

		this._updateWidth(zoom);

		if (this._mainDiv) {
			const divLocation = ev.nativeEvent.offsetX + this._mainDiv.scrollLeft;
			const zoomPoint = divLocation / oldZoom;

			this._mainDiv.scrollLeft = (zoomPoint * zoom) - ev.nativeEvent.offsetX;
		}

		this._timelines.forEach((t) => t.setZoom(zoom));
	}

	/**
	 * Sets the new scroll top value of the main div.
	 * @param scrollTop defines the value of the new scroll top.
	 */
	public setScrollHeight(scrollTop: number): void {
		if (this._mainDiv) {
			this._mainDiv.scrollTop = Math.round(scrollTop);
		}
	}

	/**
	 * Called on the user scrolls in the timelines div.
	 */
	private _handleTimelineScroll(ev: React.UIEvent<HTMLDivElement>): void {
		this.timeTracker?.setState({
			scrollTop: ev.currentTarget.scrollTop,
			scrollLeft: ev.currentTarget.scrollLeft,
		});

		this.timeMeasure?.setState({
			scrollLeft: ev.currentTarget.scrollLeft,
		});

		if (this._mainDiv) {
			this.timeTracker?.setState({ scrollTop: this._mainDiv.scrollTop });
			this.props.cinematicEditor._tracks?.setScrollHeight(this._mainDiv.scrollTop);
		}
	}

	/**
	 * Updates the width of the panel according to the given zoom.
	 */
	private _updateWidth(zoom: number): void {
		const width = this.state.panelWidth * zoom;

		this.timeTracker?.setState({ zoom, width });
		this.timeMeasure?.setState({ zoom, width });

		this.setState({ zoom, width });
	}

	/**
	 * Returns the list of all timeline nodes for the camera.
	 */
	private _getCameraTreeNodeData(): TreeNodeInfo<ICinematicTrack>[] {
		const nodes: TreeNodeInfo<ICinematicTrack>[] = [{
			disabled: true,
			isSelected: false,
			id: "cinematic-editor-time-measure",
			label: "",
		}];

		if (this.props.cinematicEditor._tracks?.isNodeExpanded("cinematic-editor-camera")) {
			nodes.push.apply(nodes, [{
				id: "cinematic-editor-camera-position",
				label: this._getTimelineForTrack(this.props.cinematic.camera.position),
			}, {
				id: "cinematic-editor-camera-target",
				label: this._getTimelineForTrack(this.props.cinematic.camera.target),
			}, {
				id: "cinematic-editor-camera-fov",
				label: this._getTimelineForTrack(this.props.cinematic.camera.fov),
			}, {
				id: "cinematic-editor-camera-focus-distance",
				label: this._getTimelineForTrack(this.props.cinematic.camera.focusDistance),
			}, {
				id: "cinematic-editor-camera-fstop",
				label: this._getTimelineForTrack(this.props.cinematic.camera.fStop),
			}, {
				id: "cinematic-editor-camera-focal-length",
				label: this._getTimelineForTrack(this.props.cinematic.camera.focalLength),
			}]);
		}

		return nodes;
	}

	/**
	 * Returns the list of all timeline nodes created by the user.
	 */
	private _getContentTreeNodeData(): TreeNodeInfo<ICinematicTrack>[] {
		const result: TreeNodeInfo<ICinematicTrack>[] = [];

		this.props.cinematic.tracks.map((t, index) => {
			if (t.type === CinematicTrackType.Group) {
				result.push({
					id: `trackGroup${index}`,
					label: <div style={{ width: "100%", height: "30px", background: "#22222255", borderRadius: "15px" }} />,
				});

				if (this.props.cinematicEditor._tracks?.isNodeExpanded(`trackGroup${index}`)) {
					t.group!.tracks.forEach((t2, index2) => {
						result.push({
							id: `trackGroup${index}-${index2}`,
							label: this._getTimelineForTrack(t2),
						});
					});
				}

				return;
			}

			result.push({
				id: `track${index}`,
				label: this._getTimelineForTrack(t),
			});
		});

		return result;
	}

	/**
	 * Returns the timeline element for the given track.
	 */
	private _getTimelineForTrack(track: ICinematicTrack): JSX.Element {
		return (
			<Timeline
				track={track}
				timelines={this}
				zoom={this.state.zoom}
				key={Tools.RandomId()}
				editor={this.props.editor}
				cinematic={this.props.cinematic}
				ref={(r) => r && this._timelines.push(r)}
			/>
		);
	}

	/**
	 * Called on the user clicks on the timeline.
	 */
	private _handleMouseDown(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ev.stopPropagation();

		if (this._moving || !this._mainDiv) {
			return;
		}

		this._moving = true;

		this._startX = ev.clientX;
		this._startY = ev.clientY;

		this._startPositionY = this._mainDiv.scrollTop;
		this._startPositionX = this._mainDiv.scrollLeft;

		document.addEventListener("mouseup", this._mouseUpEventListener = () => {
			this._moving = false;

			document.removeEventListener("mouseup", this._mouseUpEventListener!);
			document.removeEventListener("mousemove", this._mouseMoveEventListener!);

			this._mouseUpEventListener = null;
			this._mouseMoveEventListener = null;
		});

		document.addEventListener("mousemove", this._mouseMoveEventListener = (ev) => {
			const diffX = this._startX - ev.clientX;
			const diffY = this._startY - ev.clientY;

			if (this._mainDiv) {
				this._mainDiv.scrollTop = this._startPositionY + diffY;
				this._mainDiv.scrollLeft = this._startPositionX + diffX;
			}
		});
	}
}
