import { AiOutlineClose } from "react-icons/ai";
import { Component, MouseEvent, ReactNode } from "react";

import { IAnimatable, IAnimationKey } from "babylonjs";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationTimelineKeyProps {
	scale: number;
	animatable: IAnimatable;
	animationKey: IAnimationKey;
	animationEditor: EditorAnimation;

	onClicked: (key: IAnimationKey) => void;
	onRemoved: (key: IAnimationKey) => void;
	onMoved: (movedKeys: IAnimationKeyConfigurationToMove[][]) => void;
}

export interface IEditorAnimationTimelineKeyState {
	moving: boolean | undefined;
}

export interface IAnimationKeyConfigurationToMove {
	key: IAnimationKey;
	startPosition: number;
}

export class EditorAnimationTimelineKey extends Component<IEditorAnimationTimelineKeyProps, IEditorAnimationTimelineKeyState> {
	public constructor(props: IEditorAnimationTimelineKeyProps) {
		super(props);

		this.state = {
			moving: undefined,
		};
	}

	public render(): ReactNode {
		return (
			<Tooltip delayDuration={0} open={this.state.moving}>
				<TooltipTrigger
					style={{
						left: `${this.props.animationKey.frame * this.props.scale}px`,
					}}
					className={`
                        absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                        ${this.state.moving ? "" : "transition-all duration-150 ease-in-out"}
                    `}
				>
					<ContextMenu>
						<ContextMenuTrigger onContextMenu={(ev) => ev.stopPropagation()}>
							<div
								onMouseDown={(ev) => this._handlePointerDown(ev)}
								onDoubleClick={() => this.props.animationEditor.timelines.setCurrentTime(this.props.animationKey.frame)}
								className="w-4 h-4 rotate-45 bg-muted-foreground hover:scale-125 transition-transform duration-300 ease-in-out"
							/>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this.props.onRemoved(this.props.animationKey)}>
								<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
							</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				</TooltipTrigger>
				<TooltipContent>{this.props.animationKey.frame}</TooltipContent>
			</Tooltip>
		);
	}

	private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
		ev.stopPropagation();

		if (ev.button !== 0) {
			return;
		}

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		if (this.props.animationKey.frame === 0) {
			return document.body.addEventListener(
				"mouseup",
				(mouseUpListener = (ev) => {
					ev.stopPropagation();

					document.body.removeEventListener("mouseup", mouseUpListener);

					waitNextAnimationFrame().then(() => {
						this.props.onClicked(this.props.animationKey);
					});
				})
			);
		}

		this.setState({ moving: true });

		document.body.style.cursor = "ew-resize";

		let moving = false;
		let clientX: number | null = null;

		const startPosition = this.props.animationKey.frame;
		const animationsKeyConfigurationsToMove: IAnimationKeyConfigurationToMove[][] = [];

		if (ev.shiftKey) {
			const keys = this.props.animatable.animations!.map<IAnimationKeyConfigurationToMove[]>((animation) => {
				return animation
					.getKeys()
					.filter((key) => key.frame >= startPosition)
					.map((key) => ({
						key,
						startPosition: key.frame,
					}));
			});

			animationsKeyConfigurationsToMove.push(...keys);
		} else {
			animationsKeyConfigurationsToMove.push([
				{
					key: this.props.animationKey,
					startPosition: this.props.animationKey.frame,
				},
			]);
		}

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

				animationsKeyConfigurationsToMove.forEach((configuration) => {
					configuration.forEach((key) => {
						key.key.frame = Math.round(Math.max(0, key.startPosition - delta / this.props.scale));
					});
				});

				this.props.animationEditor.timelines.forceUpdate();
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				this.setState({ moving: undefined });

				this.props.animationEditor.timelines.tracks.forEach((track) => {
					track?.keyFrames.forEach((key) => {
						key?.setState({ moving: undefined });
					});
				});

				waitNextAnimationFrame().then(() => {
					this.props.onClicked(this.props.animationKey);

					if (moving) {
						this.props.onMoved(animationsKeyConfigurationsToMove);
					}
				});
			})
		);
	}
}
