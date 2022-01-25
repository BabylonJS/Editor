import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Tooltip } from "@blueprintjs/core";

import { AnimationGroup } from "babylonjs";

import { Icon } from "../../../../editor/gui/icon";

import { undoRedo } from "../../../../editor/tools/undo-redo";

import { Editor } from "../../../../editor/editor";

import { Cinematic } from "../../../../editor/cinematic/cinematic";
import { ICinematicAnimationGroupSlot, ICinematicAnimationGroupTrack } from "../../../../editor/cinematic/track";

import { Timeline } from "../timeline";

import { TrackElements, TrackElementType } from "./elements";

export interface ICardTransform {
	/**
	 * Defines the position of the card expressed in pixels.
	 */
	position: number;
}

export interface ICardProps extends ICardTransform {
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
	 * Defines the reference to the cinematic.
	 */
	cinematic: Cinematic;
	/**
	 * Defines the reference to the animation group's track.
	 */
	track: ICinematicAnimationGroupTrack;
	/**
	 * Defines the reference to the animation group's slot.
	 */
	animationGroupSlot: ICinematicAnimationGroupSlot;
}

export interface ICardState extends ICardTransform {
	/**
	 * Defines the current zoom applied on the card.
	 */
	zoom: number;
	/**
	 * Defines the width of the card.
	 */
	width: number;
}

export class Card extends React.Component<ICardProps, ICardState> {
	/** @hidden */
	public _startPosition: number = 0;

	private _mouseUpEventListener: Nullable<(ev: MouseEvent) => void> = null;
	private _mouseMoveEventListener: Nullable<(ev: MouseEvent) => void> = null;

	private _startX: number = 0;

	private _moving: boolean = false;

	private _animationGroup: Nullable<AnimationGroup> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ICardProps) {
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
		return TrackElementType.Card;
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
					height: "20px",
					lineHeight: "20px",
					cursor: "ew-resize",
					textAlign: "center",
					borderRadius: "5px",
					position: "absolute",
					backgroundColor: "#888888",
					width: `${this.state.width * this.state.zoom}px`,
					marginLeft: `${this.state.position * this.state.zoom}px`,
				}}
			>
				<Tooltip content={this.props.track.name} position="top">
					<p style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
						{this.props.track.name}
					</p>
				</Tooltip>
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		TrackElements.Cards.push(this);
		TrackElements.All.push(this);

		this._animationGroup = this.props.editor.scene?.getAnimationGroupByName(this.props.track.name) ?? null;
		if (!this._animationGroup) {
			return;
		}

		const framesPerSecond = this._animationGroup.targetedAnimations[0]?.animation?.framePerSecond ?? null;
		if (framesPerSecond === null) {
			return;
		}

		const framesCount = this._animationGroup.to - this._animationGroup.from;
		this.setState({ width: framesCount * (this.props.cinematic.framesPerSecond / framesPerSecond) });
	}

	/**
	 * Called on the component will unmount.
	 */
	public componentWillUnmount(): void {
		// Remove from keys
		let index = TrackElements.Cards.indexOf(this);
		if (index !== -1) {
			TrackElements.Cards.splice(index, 1);
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

		ev.stopPropagation();

		this._moving = true;
		this._startX = ev.clientX;

		TrackElements.PrepareDragAndDrop();

		document.addEventListener("mouseup", this._mouseUpEventListener = () => {
			this._moving = false;

			document.removeEventListener("mouseup", this._mouseUpEventListener!);
			document.removeEventListener("mousemove", this._mouseMoveEventListener!);

			this._mouseUpEventListener = null;
			this._mouseMoveEventListener = null;

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
				<MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveCard()} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to remove the card.
	 * Handles undo-redo.
	 */
	private _handleRemoveCard(): void {
		const animationGroupSlot = this.props.animationGroupSlot;

		undoRedo.push({
			common: () => {
				this.props.track.slots.sort((a, b) => a.position - b.position);
				this.props.timeline.props.timelines.refreshTimelines();
			},
			undo: () => {
				this.props.track.slots.push(animationGroupSlot);
			},
			redo: () => {
				const index = this.props.track.slots.indexOf(animationGroupSlot);
				if (index !== -1) {
					this.props.track.slots.splice(index, 1);
				}
			},
		});
	}
}
