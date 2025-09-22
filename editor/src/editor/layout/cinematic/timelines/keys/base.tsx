import { Component, ReactNode } from "react";

import { FaExchangeAlt } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";

import { CinematicKeyType, ICinematicTrack, isCinematicGroup, isCinematicKey, isCinematicKeyCut, isCinematicKeyEvent, isCinematicSound } from "babylonjs-editor-tools";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../../../ui/shadcn/ui/context-menu";

import { waitNextAnimationFrame } from "../../../../../tools/tools";

import { CinematicEditor } from "../../editor";

import { configureDivEvents } from "../move";
import { getKeyFrame, transformKeyAs } from "../tools";

import { CinematicEditorSoundKey } from "./sound";
import { CinematicEditorEventKey } from "./event";
import { CinematicEditorPropertyKey } from "./property";
import { CinematicEditorAnimationGroupKey } from "./animation-group";

export interface ICinematicEditorKeyBaseProps {
	cinematicEditor: CinematicEditor;
	scale: number;
	track: ICinematicTrack;
	cinematicKey: CinematicKeyType;

	onRemoved: () => void;
}

export interface ICinematicEditorKeyBaseState {
	move: boolean;
}

export class CinematicEditorKeyBase extends Component<ICinematicEditorKeyBaseProps, ICinematicEditorKeyBaseState> {
	private _divRef: HTMLDivElement | null = null;

	public constructor(props: ICinematicEditorKeyBaseProps) {
		super(props);

		this.state = {
			move: false,
		};
	}

	public render(): ReactNode {
		const component = this._getComponent();
		if (!component) {
			return null;
		}

		return (
			<Tooltip delayDuration={0} open={this.state.move}>
				<TooltipTrigger
					style={{
						left: `${getKeyFrame(this.props.cinematicKey) * this.props.scale}px`,
					}}
					className={`
                        absolute top-1/2 -translate-y-1/2
                    `}
				>
					<ContextMenu>
						<ContextMenuTrigger onContextMenu={(ev) => ev.stopPropagation()}>
							<div
								ref={(div) => (this._divRef = div)}
								onDoubleClick={() => this._handleDoubleClick()}
								onClick={() => !this.state.move && this.props.cinematicEditor.inspector.setEditedObject(this.props.cinematicKey, this.props.track)}
							>
								{component}
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent>
							{(isCinematicKey(this.props.cinematicKey) || isCinematicKeyCut(this.props.cinematicKey)) && (
								<>
									<ContextMenuItem className="flex items-center gap-2" onClick={() => transformKeyAs(this.props.cinematicEditor, this.props.cinematicKey as any)}>
										<FaExchangeAlt className="w-5 h-5" />
										Transform as {this.props.cinematicKey.type === "key" ? "Cut Key" : "Simple Key"}
									</ContextMenuItem>
									<ContextMenuSeparator />
								</>
							)}
							<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this.props.onRemoved()}>
								<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
							</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				</TooltipTrigger>
				<TooltipContent>{this._getTooltipContent()}</TooltipContent>
			</Tooltip>
		);
	}

	public componentDidMount(): void {
		configureDivEvents({
			div: this._divRef!,
			cinematicKey: this.props.cinematicKey,
			cinematicEditor: this.props.cinematicEditor,

			onMoveStart: () => {
				this.setState({ move: true });
			},
			onMove: () => {
				this.props.cinematicEditor.timelines.forceUpdate();
			},
			onMoveEnd: () => {
				this.props.cinematicEditor.inspector.setEditedObject(this.props.cinematicKey, this.props.track);

				waitNextAnimationFrame().then(() => {
					this.setState({ move: false });

					this.props.cinematicEditor.timelines.sortAnimationsKeys();
					this.props.cinematicEditor.timelines.forceUpdate();
				});
			},
		});
	}

	private _getComponent(): ReactNode {
		if (isCinematicKeyCut(this.props.cinematicKey) || isCinematicKey(this.props.cinematicKey)) {
			return (
				<CinematicEditorPropertyKey cinematicEditor={this.props.cinematicEditor} scale={this.props.scale} move={this.state.move} cinematicKey={this.props.cinematicKey} />
			);
		}

		if (isCinematicSound(this.props.cinematicKey)) {
			return <CinematicEditorSoundKey cinematicEditor={this.props.cinematicEditor} scale={this.props.scale} move={this.state.move} cinematicKey={this.props.cinematicKey} />;
		}

		if (isCinematicKeyEvent(this.props.cinematicKey)) {
			return <CinematicEditorEventKey cinematicEditor={this.props.cinematicEditor} scale={this.props.scale} move={this.state.move} cinematicKey={this.props.cinematicKey} />;
		}

		if (isCinematicGroup(this.props.cinematicKey)) {
			return (
				<CinematicEditorAnimationGroupKey
					cinematicEditor={this.props.cinematicEditor}
					scale={this.props.scale}
					move={this.state.move}
					cinematicKey={this.props.cinematicKey}
				/>
			);
		}

		return null;
	}

	private _handleDoubleClick(): void {
		const frame = getKeyFrame(this.props.cinematicKey);
		this.props.cinematicEditor.timelines.setCurrentTime(frame);
		this.props.cinematicEditor.disposeTemporaryAnimationGroup();
	}

	private _getTooltipContent(): ReactNode {
		const seconds = getKeyFrame(this.props.cinematicKey) / 60;
		const minutes = Math.floor(seconds / 60);

		return (
			<div className="flex flex-col gap-2 justify-center items-center p-2">
				<div className="font-semibold text-primary-foreground">{getKeyFrame(this.props.cinematicKey)}</div>
				<div className="flex gap-1 items-center text-primary-foreground">
					{minutes >= 1 && <>{minutes >> 0}min</>}
					{(seconds - minutes * 60).toFixed(2)}s
				</div>
			</div>
		);
	}
}
