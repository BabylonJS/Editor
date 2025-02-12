import { FaExchangeAlt } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";

import { Component, MouseEvent, ReactNode } from "react";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { isCinematicGroup, isCinematicKey, isCinematicKeyCut, isCinematicSound } from "../schema/guards";
import { ICinematic, ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicSound, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTimelineKeyProps {
    scale: number;
    cinematic: ICinematic;
    cinematicTrack: ICinematicTrack;
    cinematicEditor: CinematicEditor;
    cinematicKey: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | ICinematicSound;

    onClicked: (key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | ICinematicSound) => void;
    onRemoved: (key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | ICinematicSound) => void;
    onMoved: (movedKeys: ICinematicKeyConfigurationToMove[][]) => void;
}

export interface ICinematicEditorTimelineKeyState {
    moving: boolean | undefined;
}

export interface ICinematicKeyConfigurationToMove {
    startPosition: number;
    key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | ICinematicSound;
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
                        ${this.props.cinematicKey.type === "group" || this.props.cinematicKey.type === "sound" ? "" : "-translate-x-1/2"}
                        ${this.state.moving ? "" : "transition-all duration-150 ease-in-out"}
                    `}
                >
                    <ContextMenu>
                        <ContextMenuTrigger
                            onContextMenu={(ev) => ev.stopPropagation()}
                        >
                            {this.props.cinematicKey.type === "group" &&
                                <div
                                    style={{
                                        width: `${this._getAnimationGroupFramesCount() * this.props.scale / this.props.cinematicKey.speed}px`,
                                    }}
                                    onMouseDown={(ev) => this._handlePointerDown(ev)}
                                    onDoubleClick={() => this.props.cinematicEditor.timelines.setCurrentTime(this._getFrame())}
                                    className="h-4 rounded-md bg-muted-foreground"
                                />
                            }

                            {this.props.cinematicKey.type === "sound" &&
                                <div
                                    style={{
                                        width: `${this._getSoundFramesCount() * this.props.scale}px`,
                                    }}
                                    onMouseDown={(ev) => this._handlePointerDown(ev)}
                                    onDoubleClick={() => this.props.cinematicEditor.timelines.setCurrentTime(this._getFrame())}
                                    className="h-4 rounded-md bg-gradient-to-t from-green-400 dark:from-green-800 to-muted-foreground dark:to-muted-foreground"
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
                            {(this.props.cinematicKey.type === "key" || this.props.cinematicKey.type === "cut") &&
                                <>
                                    <ContextMenuItem className="flex items-center gap-2" onClick={() => this._transformAs()} >
                                        <FaExchangeAlt className="w-5 h-5" />
                                        Transform as {this.props.cinematicKey.type === "key" ? "Cut Key" : "Simple Key"}
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                </>
                            }
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
                    {this._getTooltipContent()}
                </TooltipContent>
            </Tooltip>
        );
    }

    private _getTooltipContent(): ReactNode {
        const seconds = this._getFrame() / 60;
        const minutes = Math.floor(seconds / 60);

        return (
            <div className="flex flex-col gap-2 justify-center items-center p-2">
                <div className="font-semibold text-primary-foreground">
                    {this._getFrame()}
                </div>
                <div className="flex gap-1 items-center text-primary-foreground">
                    {minutes >= 1 &&
                        <>
                            {minutes >> 0}min
                        </>
                    }
                    {(seconds - minutes * 60).toFixed(2)}s
                </div>
            </div>
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

    private _getSoundFramesCount(): number {
        if (!isCinematicSound(this.props.cinematicKey)) {
            return 0;
        }

        return this.props.cinematicKey.endFrame - this.props.cinematicKey.startFrame;
    }

    private _transformAs(): void {
        const cloneKey = { ...this.props.cinematicKey } as ICinematicKey;
        const cloneKeyCut = { ...this.props.cinematicKey } as ICinematicKeyCut;

        const oldKey = { ...this.props.cinematicKey } as ICinematicKey | ICinematicKeyCut;
        const resultKey = {} as ICinematicKey | ICinematicKeyCut;

        switch (oldKey.type) {
            case "cut":
                resultKey.type = "key";
                if (isCinematicKey(resultKey)) {
                    resultKey.frame = cloneKeyCut.key1.frame;
                    resultKey.value = cloneKeyCut.key1.value?.clone?.() ?? cloneKeyCut.key1.value;
                    resultKey.inTangent = cloneKeyCut.key1.inTangent?.clone?.() ?? cloneKeyCut.key1.inTangent;
                    resultKey.outTangent = cloneKeyCut.key1.outTangent?.clone?.() ?? cloneKeyCut.key1.outTangent;
                }
                break;

            case "key":
                resultKey.type = "cut";
                if (isCinematicKeyCut(resultKey)) {
                    resultKey.key1 = {
                        frame: cloneKey.frame,
                        value: cloneKey.value?.clone?.() ?? cloneKey.value,
                        inTangent: cloneKey.inTangent?.clone?.() ?? cloneKey.inTangent,
                        outTangent: cloneKey.outTangent?.clone?.() ?? cloneKey.outTangent,
                    };
                    resultKey.key2 = {
                        frame: cloneKey.frame,
                        value: cloneKey.value?.clone?.() ?? cloneKey.value,
                        inTangent: cloneKey.inTangent?.clone?.() ?? cloneKey.inTangent,
                        outTangent: cloneKey.outTangent?.clone?.() ?? cloneKey.outTangent,
                    };
                }
                break;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                Object.keys(this.props.cinematicKey).forEach((key) => {
                    delete this.props.cinematicKey[key];
                });

                Object.keys(oldKey).forEach((key) => {
                    this.props.cinematicKey[key] = oldKey[key];
                });
            },
            redo: () => {
                Object.keys(this.props.cinematicKey).forEach((key) => {
                    delete this.props.cinematicKey[key];
                });

                Object.keys(resultKey).forEach((key) => {
                    this.props.cinematicKey[key] = resultKey[key];
                });
            },
        });

        this.props.cinematicEditor.forceUpdate();
    }

    private _handlePointerDown(ev: MouseEvent<HTMLDivElement, globalThis.MouseEvent>): void {
        ev.stopPropagation();

        if (ev.button !== 0) {
            return;
        }

        let mouseUpListener: (event: globalThis.MouseEvent) => void;
        let mouseMoveListener: (event: globalThis.MouseEvent) => void;

        if (this.props.cinematicKey.type !== "group" && this.props.cinematicKey.type !== "sound" && this._getFrame() === 0) {
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

                track.sounds?.forEach((sound) => {
                    if (sound.frame >= startPosition) {
                        result.push({
                            key: sound,
                            startPosition: sound.frame,
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
