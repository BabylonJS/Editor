import { AiOutlineClose } from "react-icons/ai";
import { Component, MouseEvent, ReactNode } from "react";

import { IAnimatable, IAnimationKey } from "babylonjs";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { isCinematicKeyCut } from "../cinematic/guards";
import { ICinematic, ICinematicKey, ICinematicKeyCut } from "../cinematic/typings";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationTimelineKeyProps {
    scale: number;
    cinematic: ICinematic | null;
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
    animationKey: IAnimationKey | null;
    cinematicAnimationKey: ICinematicKey | ICinematicKeyCut | null;

    onClicked: (key: IAnimationKey | ICinematicKey | ICinematicKeyCut) => void;
    onRemoved: (key: IAnimationKey | ICinematicKey | ICinematicKeyCut) => void;
    onMoved: (movedKeys: (IAnimationKeyConfigurationToMove | ICinematicKeyConfigurationToMove)[][]) => void;
}

export interface IEditorAnimationTimelineKeyState {
    moving: boolean | undefined;
}

export interface IAnimationKeyConfigurationToMove {
    key: IAnimationKey;
    startPosition: number;
}

export interface ICinematicKeyConfigurationToMove {
    startPosition: number;
    key: ICinematicKey | ICinematicKeyCut;
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
                        left: `${this._getKeyFrame() * this.props.scale}px`,
                    }}
                    className={`
                        absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                        ${this.state.moving ? "" : "transition-all duration-150 ease-in-out"}
                    `}
                    onContextMenu={(ev) => ev.stopPropagation()}
                >
                    <ContextMenu>
                        <ContextMenuTrigger>
                            <div
                                onMouseDown={(ev) => this._handlePointerDown(ev)}
                                onDoubleClick={() => this.props.animationEditor.timelines.setCurrentTime(this._getKeyFrame())}
                                className={`
                                    w-4 h-4 rotate-45 hover:scale-125
                                    ${this.props.cinematicAnimationKey && isCinematicKeyCut(this.props.cinematicAnimationKey) ? "border-[2px] border-orange-500 bg-muted" : "bg-muted-foreground"}
                                    transition-transform duration-300 ease-in-out    
                                `}
                            />
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem
                                onClick={() => this._handleRemove()}
                                className="flex items-center gap-2 !text-red-400"
                            >
                                <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </TooltipTrigger>
                <TooltipContent>
                    {this._getKeyFrame()}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _getKeyFrame(): number {
        if (this.props.animationKey) {
            return this.props.animationKey.frame;
        }

        if (isCinematicKeyCut(this.props.cinematicAnimationKey)) {
            return this.props.cinematicAnimationKey.key1.frame;
        }

        return this.props.cinematicAnimationKey!.frame;
    }

    private _handleRemove(): void {
        if (this.props.animationKey || this.props.cinematicAnimationKey) {
            this.props.onRemoved(this.props.animationKey! ?? this.props.cinematicAnimationKey!);
        }
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        ev.stopPropagation();

        if (ev.button !== 0) {
            return;
        }

        this.setState({ moving: true });

        document.body.style.cursor = "ew-resize";

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        let moving = false;
        let clientX: number | null = null;

        const startPosition = this._getKeyFrame();
        const animationsKeyConfigurationsToMove: (IAnimationKeyConfigurationToMove | ICinematicKeyConfigurationToMove)[][] = [];

        if (ev.shiftKey) {
            if (this.props.animatable) {
                const keys = this.props.animatable.animations!.map<IAnimationKeyConfigurationToMove[]>((animation) => {
                    return animation.getKeys().filter((key) => key.frame >= startPosition).map((key) => ({
                        key,
                        startPosition: key.frame,
                    }));
                });

                animationsKeyConfigurationsToMove.push(...keys);
            }

            this.props.cinematic?.tracks.forEach((track) => {
                const result: ICinematicKeyConfigurationToMove[] = [];

                track.keyFrameAnimations?.forEach((key) => {
                    const frame = isCinematicKeyCut(key)
                        ? key.key1.frame
                        : key.frame;

                    if (frame >= startPosition) {
                        result.push({
                            key,
                            startPosition: frame,
                        });
                    }
                });

                // track.animationGroups?.forEach((group) => {
                //     if (group.frame >= startPosition) {
                //         result.push({
                //             key: group,
                //             startPosition: group.frame,
                //         });
                //     }
                // });

                animationsKeyConfigurationsToMove.push(result);
            });
        } else {
            animationsKeyConfigurationsToMove.push([{
                startPosition: this._getKeyFrame(),
                key: this.props.animationKey! ?? this.props.cinematicAnimationKey!,
            }]);
        }

        document.body.addEventListener("mousemove", mouseMoveListener = (ev) => {
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
                configuration.forEach((configuration) => {
                    const frame = Math.max(0, configuration.startPosition - delta / this.props.scale);

                    if (isCinematicKeyCut(configuration.key)) {
                        configuration.key.key1.frame = frame;
                        configuration.key.key2.frame = frame;
                    } else {
                        configuration.key.frame = frame;
                    }
                });
            });

            this.props.animationEditor.timelines.forceUpdate();
        });

        document.body.addEventListener("mouseup", mouseUpListener = (ev) => {
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
                if (!moving) {
                    this.props.onClicked(this.props.animationKey! ?? this.props.cinematicAnimationKey!);
                }

                if (moving) {
                    this.props.onMoved(animationsKeyConfigurationsToMove);
                }
            });
        });
    }
}
