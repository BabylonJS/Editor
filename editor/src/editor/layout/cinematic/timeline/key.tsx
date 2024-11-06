import { AiOutlineClose } from "react-icons/ai";
import { Component, MouseEvent, ReactNode } from "react";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { isCinematicGroup, isCinematicKeyCut } from "../schema/guards";
import { ICinematic, ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTimelineKeyProps {
    scale: number;
    cinematic: ICinematic;
    cinematicTrack: ICinematicTrack;
    cinematicEditor: CinematicEditor;
    cinematicKey: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup;

    onClicked: (key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup) => void;
    onRemoved: (key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup) => void;
    onMoved: (movedKeys: ICinematicKeyConfigurationToMove[][]) => void;
}

export interface ICinematicEditorTimelineKeyState {
    moving: boolean | undefined;
}

export interface ICinematicKeyConfigurationToMove {
    startPosition: number;
    key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup;
}

export class CinematicEditorTimelineKey extends Component<ICinematicEditorTimelineKeyProps, ICinematicEditorTimelineKeyState> {
    public constructor(props: ICinematicEditorTimelineKeyProps) {
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
                        left: `${this._getFrame() * this.props.scale}px`,
                    }}
                    className={`
                        absolute top-1/2 -translate-y-1/2
                        ${this.props.cinematicKey.type === "group" ? "" : "-translate-x-1/2"}
                        ${this.state.moving ? "" : "transition-all duration-150 ease-in-out"}
                    `}
                >
                    <ContextMenu>
                        <ContextMenuTrigger>
                            {this.props.cinematicKey.type === "group" &&
                                <div
                                    style={{
                                        width: `${this._getAnimationGroupFramesCount() * this.props.scale}px`,
                                    }}
                                    onMouseDown={(ev) => this._handlePointerDown(ev)}
                                    onDoubleClick={() => this.props.cinematicEditor.timelines.setCurrentTime(this._getFrame())}
                                    className="h-4 rounded-md bg-muted-foreground"
                                />
                            }

                            {(this.props.cinematicKey.type === "key" || this.props.cinematicKey.type === "cut") &&
                                <div
                                    onMouseDown={(ev) => this._handlePointerDown(ev)}
                                    onDoubleClick={() => this.props.cinematicEditor.timelines.setCurrentTime(this._getFrame())}
                                    className={`
                                        w-4 h-4 rotate-45 hover:scale-125
                                        ${isCinematicKeyCut(this.props.cinematicKey) ? "border-[2px] border-orange-500 bg-muted" : "bg-muted-foreground"}
                                        transition-transform duration-300 ease-in-out    
                                    `}
                                />
                            }
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem
                                className="flex items-center gap-2 !text-red-400"
                                onClick={() => this.props.onRemoved(this.props.cinematicKey)}
                            >
                                <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </TooltipTrigger>
                <TooltipContent>
                    {this._getFrame()}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _getFrame(): number {
        if (isCinematicKeyCut(this.props.cinematicKey)) {
            return this.props.cinematicKey.key1.frame;
        }

        return this.props.cinematicKey.frame;
    }

    private _getAnimationGroupFramesCount(): number {
        if (!isCinematicGroup(this.props.cinematicKey)) {
            return 0;
        }

        return this.props.cinematicKey.endFrame - this.props.cinematicKey.startFrame;
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        ev.stopPropagation();

        if (ev.button !== 0) {
            return;
        }

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        if (this.props.cinematicKey.type !== "group" && this._getFrame() === 0) {
            return document.body.addEventListener("mouseup", mouseUpListener = (ev) => {
                ev.stopPropagation();

                document.body.removeEventListener("mouseup", mouseUpListener);

                waitNextAnimationFrame().then(() => {
                    this.props.onClicked(this.props.cinematicKey);
                });
            });
        }

        this.setState({ moving: true });

        document.body.style.cursor = "ew-resize";

        let moving = false;
        let clientX: number | null = null;

        const startPosition = this._getFrame();
        const animationsKeyConfigurationsToMove: ICinematicKeyConfigurationToMove[][] = [];

        if (ev.shiftKey) {
            this.props.cinematic.tracks.forEach((track) => {
                const result: ICinematicKeyConfigurationToMove[] = [];

                track.animationGroups?.forEach((animationGroup) => {
                    if (animationGroup.frame >= startPosition) {
                        result.push({
                            key: animationGroup,
                            startPosition: animationGroup.frame,
                        });
                    }
                });

                track.keyFrameAnimations?.forEach((key) => {
                    const frame = isCinematicKeyCut(key) ? key.key1.frame : key.frame;
                    if (frame >= startPosition) {
                        result.push({
                            key,
                            startPosition: isCinematicKeyCut(key) ? key.key1.frame : key.frame,
                        });
                    }
                });

                animationsKeyConfigurationsToMove.push(result);
            });
        } else {
            animationsKeyConfigurationsToMove.push([{
                startPosition,
                key: this.props.cinematicKey,
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

            animationsKeyConfigurationsToMove.forEach((trackConfiguration) => {
                trackConfiguration.forEach((keyConfiguration) => {
                    const frame = Math.round(
                        Math.max(0, keyConfiguration.startPosition - delta / this.props.scale),
                    );

                    if (isCinematicKeyCut(keyConfiguration.key)) {
                        keyConfiguration.key.key1.frame = frame;
                        keyConfiguration.key.key2.frame = frame;
                    } else {
                        keyConfiguration.key.frame = frame;
                    }
                });
            });

            this.props.cinematicEditor.timelines.forceUpdate();
        });

        document.body.addEventListener("mouseup", mouseUpListener = (ev) => {
            ev.stopPropagation();

            document.body.style.cursor = "auto";

            document.body.removeEventListener("mouseup", mouseUpListener);
            document.body.removeEventListener("mousemove", mouseMoveListener);

            this.setState({ moving: undefined });

            this.props.cinematicEditor.timelines.tracks.forEach((track) => {
                track?.keyFrames.forEach((key) => {
                    key?.setState({ moving: undefined });
                });
            });

            waitNextAnimationFrame().then(() => {
                this.props.onClicked(this.props.cinematicKey);

                if (moving) {
                    this.props.onMoved(animationsKeyConfigurationsToMove);
                }
            });
        });
    }
}
