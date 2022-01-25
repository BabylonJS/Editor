import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Tooltip } from "@blueprintjs/core";

import { IAnimationKey } from "babylonjs";

import { Icon } from "../../../../editor/gui/icon";

import { undoRedo } from "../../../../editor/tools/undo-redo"
;
import { Editor } from "../../../../editor/editor";

import { CinematicTrackType, ICinematicPropertyTrackBase } from "../../../../editor/cinematic/track";

import { InspectorNotifier } from "../../../../editor/gui/inspector/notifier";

import { Timeline } from "../timeline";
import { CinematicAimationKey } from "../../inspectors/key-inspector";

import { TrackElements, TrackElementType } from "./elements";

export interface IKeyTransform {
	/**
	 * Defines the position of the card expressed in pixels.
	 */
	position: number;
}

export interface IKeyProps extends IKeyTransform {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the current zoom applied on the card.
	 */
	zoom: number;
	/**
	 * Defines the reference to the timeline.
	 */
	timeline: Timeline;
	/**
	 * Defines the type of key type.
	 */
	trackType: CinematicTrackType;
	/**
	 * Defines the reference to the animation group's track.
	 */
	track: ICinematicPropertyTrackBase;
	/**
	 * Defines the reference to the animation key.
	 */
	animationKey: IAnimationKey;
}

export interface IKeyState extends IKeyTransform {
	/**
	 * Defines the current zoom applied on the card.
	 */
	zoom: number;
	/**
	 * Defines the width of the card.
	 */
	width: number;
}

export class Key extends React.Component<IKeyProps, IKeyState> {
	/** @hidden */
	public _startPosition: number = 0;

	private _mouseUpEventListener: Nullable<(ev: MouseEvent) => void> = null;
	private _mouseMoveEventListener: Nullable<(ev: MouseEvent) => void> = null;

	private _startX: number = 0;

	private _moving: boolean = false;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IKeyProps) {
		super(props);

		this.state = {
			...props,
			width: 95,
		};
	}

	/**
	 * Gets the current type of element.
	 */
	public get elementType(): TrackElementType {
		return TrackElementType.Key;
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div
				onMouseDown={(ev) => this._handleMouseDown(ev)}
				onDoubleClick={() => this._handleDoubleClick()}
				onContextMenu={(ev) => this._handleContextMenu(ev)}
				onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = "#888888"}
				onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = "#444444"}
				style={{
					zIndex: 2,
					width: "20px",
					height: "20px",
					cursor: "ew-resize",
					position: "absolute",
					backgroundColor: "grey",
					transformOrigin: "top left",
					transform: "translate(2px) rotateZ(45deg) scale(0.7)",
					marginLeft: `${this.state.position * this.state.zoom}px`,
				}}
			>
				<Tooltip boundary="scrollParent" content={this.state.position.toString()} position="top">
					<div style={{ width: "20px", height: "20px" }} />
				</Tooltip>
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		TrackElements.Keys.push(this);
		TrackElements.All.push(this);
	}

	/**
	 * Called on the component will unmount.
	 */
	public componentWillUnmount(): void {
		// Remove from keys
		let index = TrackElements.Keys.indexOf(this);
		if (index !== -1) {
			TrackElements.Keys.splice(index, 1);
		}

		// Remove from all
		index = TrackElements.All.indexOf(this);
		if (index !== -1) {
			TrackElements.All.splice(index, 1);
		}
	}

	/**
	 * Sets the new value of the zoom applied on the timelines.
	 * @param zoom defines the new value of the zoom.
	 */
	public setZoom(zoom: number): void {
		this.setState({ zoom });
	}

	/**
	 * Called on the user clicks on the tracker.
	 */
	private _handleMouseDown(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		if (this._moving) {
			return;
		}

		this._moving = true;
		this._startX = ev.clientX;

		ev.stopPropagation();

		TrackElements.PrepareDragAndDrop();

		document.addEventListener("mouseup", this._mouseUpEventListener = () => {
			this._moving = false;

			document.removeEventListener("mouseup", this._mouseUpEventListener!);
			document.removeEventListener("mousemove", this._mouseMoveEventListener!);

			this._mouseUpEventListener = null;
			this._mouseMoveEventListener = null;

			InspectorNotifier.NotifyChange(this.props.animationKey);
			this.props.editor.inspector.setSelectedObject(new CinematicAimationKey(this));

			TrackElements.EndDragAndDrop(() => {
				this.props.timeline.props.timelines.refreshTimelines();
			});
		});

		document.addEventListener("mousemove", this._mouseMoveEventListener = (ev) => {
			const diff = (this._startX - ev.clientX) / this.state.zoom;

			if (ev.shiftKey) {
				TrackElements.MoveElementsFrom(this, diff);
			} else {
				TrackElements.MoveElement(this, diff);
			}
		});
	}

	/**
	 * Called on the user double clicks on the key.
	 */
	private _handleDoubleClick(): void {
		const timeline = this.props.timeline;
		timeline.props.timelines.timeTracker?.setPosition(this.state.position);
	}

	/**
	 * Called on the user right-clicks on the card.
	 */
	private _handleContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ev.stopPropagation();

		ContextMenu.show((
			<Menu>
				<MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveKey()} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to remove the key.
	 * Handles undo-redo.
	 */
	private _handleRemoveKey(): void {
		const animationKey = this.props.animationKey;

		undoRedo.push({
			common: () => {
				this.props.track.keys.sort((a, b) => a.frame - b.frame);
				this.props.timeline.props.timelines.refreshTimelines();
			},
			undo: () => {
				this.props.track.keys.push(animationKey);
			},
			redo: () => {
				const index = this.props.track.keys.indexOf(animationKey);
				if (index !== -1) {
					this.props.track.keys.splice(index, 1);
				}
			},
		});
	}
}
