import { Component, MouseEvent, ReactNode } from "react";

import { AiOutlinePlus } from "react-icons/ai";

import { Tools } from "babylonjs";
import { ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { isDomElementDescendantOf } from "../../../tools/dom";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../ui/shadcn/ui/context-menu";

import { CinematicEditor } from "./editor";

import { CinematicEditorKeyBase } from "./timelines/keys/base";
import { addAnimationGroupKey, addAnimationKey, addEventKey, addSoundKey } from "./timelines/add";
import { removeAnimationGroupKey, removeAnimationKey, removeEventKey, removeSoundKey } from "./timelines/remove";

export interface ICinematicEditorTimelinesProps {
	scale: number;
	currentTime: number;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorTimelinesState {
	rightClickPositionX: number | null;
}

export class CinematicEditorTimelines extends Component<ICinematicEditorTimelinesProps, ICinematicEditorTimelinesState> {
	private _divRef: HTMLDivElement | null = null;

	public constructor(props: ICinematicEditorTimelinesProps) {
		super(props);

		this.state = {
			rightClickPositionX: null,
		};
	}

	public render(): ReactNode {
		const width = this.getMaxWidthForTimelines();
		const cinematic = this.props.cinematicEditor.cinematic;

		return (
			<div
				ref={(r) => (this._divRef = r)}
				onMouseDown={(ev) => this._handlePointerDown(ev)}
				className={`
					relative flex flex-col flex-1 w-full min-h-fit h-full overflow-x-auto overflow-y-hidden
					${this.props.cinematicEditor.state.editType !== "keyframes" ? "hidden pointer-events-none" : ""}
				`}
			>
				<div
					style={{
						width: `${width}px`,
					}}
					className="relative min-w-full h-10 mx-2 py-2"
				/>

				{cinematic.tracks.map((track, index) => {
					return this._getTrack(track, width, index === 0);
				})}

				<div
					style={{
						width: this._divRef?.getBoundingClientRect().width + "px",
					}}
					className="fixed h-10 bg-background pointer-events-none"
				/>

				<div
					style={{
						left: `${this.props.currentTime * this.props.scale}px`,
					}}
					className="absolute w-[1px] ml-2 mt-10 bg-muted h-full pointer-events-none"
				>
					<div
						className={`
                            absolute w-7 h-7 rotate-45 -translate-x-1/2 -translate-y-8 bg-muted
                        `}
						style={{
							mask: "linear-gradient(135deg, transparent 0%, transparent 50%, black 50%, black 100%)",
						}}
					/>
				</div>
			</div>
		);
	}

	private _getTrack(track: ICinematicTrack, width: number, borderTop: boolean): ReactNode {
		track._id ??= Tools.RandomId();

		return (
			<ContextMenu key={track._id} onOpenChange={(o) => !o && this.setState({ rightClickPositionX: null })}>
				<ContextMenuTrigger>
					<div
						className={`
                            relative min-w-full h-10 mx-2 py-2
                            ${borderTop ? "border-t border-t-border/50" : ""}
                            border-b border-b-border/50
                            border-r border-r-border/50
                            border-l border-l-border/50
                            ${this.props.cinematicEditor.state.hoverTrack === track ? "bg-primary-foreground" : ""}
                            transition-all duration-300 ease-in-out
                        `}
						style={{
							width: `${width}px`,
						}}
						onContextMenu={(ev) => this.setState({ rightClickPositionX: ev.nativeEvent.offsetX })}
						onMouseEnter={() => this.props.cinematicEditor.setState({ hoverTrack: track })}
						onMouseLeave={() => this.props.cinematicEditor.setState({ hoverTrack: null })}
					>
						{track.keyFrameAnimations?.map((keyframe, index) => (
							<CinematicEditorKeyBase
								key={index}
								track={track}
								cinematicKey={keyframe}
								scale={this.props.scale}
								cinematicEditor={this.props.cinematicEditor}
								onRemoved={() => removeAnimationKey(this.props.cinematicEditor, track, keyframe)}
							/>
						))}

						{track.sounds?.map((sound, index) => (
							<CinematicEditorKeyBase
								key={index}
								track={track}
								cinematicKey={sound}
								scale={this.props.scale}
								cinematicEditor={this.props.cinematicEditor}
								onRemoved={() => removeSoundKey(this.props.cinematicEditor, track, sound)}
							/>
						))}

						{track.keyFrameEvents?.map((event, index) => (
							<CinematicEditorKeyBase
								key={index}
								track={track}
								cinematicKey={event}
								scale={this.props.scale}
								cinematicEditor={this.props.cinematicEditor}
								onRemoved={() => removeEventKey(this.props.cinematicEditor, track, event)}
							/>
						))}

						{track.animationGroups?.map((animationGroup, index) => (
							<CinematicEditorKeyBase
								key={index}
								track={track}
								scale={this.props.scale}
								cinematicKey={animationGroup}
								cinematicEditor={this.props.cinematicEditor}
								onRemoved={() => removeAnimationGroupKey(this.props.cinematicEditor, track, animationGroup)}
							/>
						))}
					</div>
				</ContextMenuTrigger>

				<ContextMenuContent>
					{track.keyFrameAnimations && (
						<>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addAnimationKey(this.props.cinematicEditor, "key", track, this.state.rightClickPositionX)}
							>
								<div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
								Add Key Here
							</ContextMenuItem>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addAnimationKey(this.props.cinematicEditor, "cut", track, this.state.rightClickPositionX)}
							>
								<div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
								Add Key Cut Here
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addAnimationKey(this.props.cinematicEditor, "key", track, this.props.currentTime * this.props.scale)}
							>
								<div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
								Add Key at Tracker Position
							</ContextMenuItem>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addAnimationKey(this.props.cinematicEditor, "cut", track, this.props.currentTime * this.props.scale)}
							>
								<div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
								Add Key Cut at Tracker Position
							</ContextMenuItem>
						</>
					)}

					{track.sounds && (
						<>
							<ContextMenuItem className="flex items-center gap-2" onClick={() => addSoundKey(this.props.cinematicEditor, track)}>
								<AiOutlinePlus className="w-5 h-5" /> Add Sound Here
							</ContextMenuItem>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addSoundKey(this.props.cinematicEditor, track, this.props.currentTime * this.props.scale)}
							>
								<AiOutlinePlus className="w-5 h-5" /> Add Sound at Tracker Position
							</ContextMenuItem>
						</>
					)}

					{track.keyFrameEvents && (
						<>
							<ContextMenuItem className="flex items-center gap-2" onClick={() => addEventKey(this.props.cinematicEditor, track)}>
								<AiOutlinePlus className="w-5 h-5" /> Add Event Here
							</ContextMenuItem>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addEventKey(this.props.cinematicEditor, track, this.props.currentTime * this.props.scale)}
							>
								<AiOutlinePlus className="w-5 h-5" /> Add Event At Tracker Position
							</ContextMenuItem>
						</>
					)}

					{track.animationGroups && (
						<>
							<ContextMenuItem className="flex items-center gap-2" onClick={() => addAnimationGroupKey(this.props.cinematicEditor, track)}>
								<AiOutlinePlus className="w-5 h-5" /> Add Group Here
							</ContextMenuItem>
							<ContextMenuItem
								className="flex items-center gap-2"
								onClick={() => addAnimationGroupKey(this.props.cinematicEditor, track, this.props.currentTime * this.props.scale)}
							>
								<AiOutlinePlus className="w-5 h-5" /> Add Group at Tracker Position
							</ContextMenuItem>
						</>
					)}
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	public getMaxWidthForTimelines(): number {
		return this.getMaxFrameForTimelines() * this.props.scale;
	}

	public getMaxFrameForTimelines(): number {
		let frame = 0;
		this.props.cinematicEditor.cinematic.tracks.forEach((track) => {
			track.animationGroups?.forEach((animationGroup) => {
				frame = Math.max(frame, animationGroup.frame + (animationGroup.endFrame - animationGroup.startFrame));
			});

			track.sounds?.forEach((sound) => {
				frame = Math.max(frame, sound.frame + (sound.endFrame - sound.startFrame));
			});

			track.keyFrameAnimations?.forEach((key) => {
				if (isCinematicKeyCut(key)) {
					frame = Math.max(frame, key.key1.frame);
				} else {
					frame = Math.max(frame, key.frame);
				}
			});

			track.keyFrameEvents?.forEach((event) => {
				frame = Math.max(frame, event.frame);
			});
		});

		return frame;
	}

	/**
	 * Sorts all the keys in the track based on their frame value.
	 */
	public sortAnimationsKeys(): void {
		this.props.cinematicEditor.cinematic.tracks.forEach((track) => {
			track.keyFrameAnimations?.sort((a, b) => {
				const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
				const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

				return frameA - frameB;
			});

			track.keyFrameEvents?.sort((a, b) => {
				return a.frame - b.frame;
			});

			track.animationGroups?.sort((a, b) => {
				return a.frame - b.frame;
			});

			track.sounds?.sort((a, b) => {
				return a.frame - b.frame;
			});

			track._id = Tools.RandomId(); // Update the ID to force a re-render
		});
	}

	private _handlePointerDown(ev: MouseEvent<HTMLDivElement>): void {
		if (ev.button !== 0 || !isDomElementDescendantOf(ev.nativeEvent.target as HTMLElement, this._divRef!)) {
			return;
		}

		document.body.style.cursor = "ew-resize";

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		let moving = false;
		let clientX: number | null = null;

		const startPosition = ev.nativeEvent.offsetX / this.props.scale;

		this.props.cinematicEditor.createTemporaryAnimationGroup();
		this.props.cinematicEditor.setCurrentTime(startPosition);

		document.body.addEventListener(
			"mousemove",
			(mouseMoveListener = (ev) => {
				if (clientX === null) {
					clientX = ev.clientX;
				}

				const delta = clientX - ev.clientX;
				if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
					moving = true;
				} else {
					return;
				}

				const currentTime = Math.round(Math.max(0, startPosition - delta / this.props.scale));

				this.props.cinematicEditor.setCurrentTime(currentTime);
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				this.props.cinematicEditor.disposeTemporaryAnimationGroup();
			})
		);
	}
}
