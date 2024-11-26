import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { Editor } from "../../../main";

import { isCinematicGroup, isCinematicKeyCut } from "../schema/guards";
import { ICinematic, ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

import { CinematicEditorTimelineKey, ICinematicKeyConfigurationToMove } from "./key";

export interface ICinematicEditorTimelineItemProps {
    scale: number;
    editor: Editor;
    currentTime: number;
    track: ICinematicTrack;
    cinematic: ICinematic;
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorTimelineItemState {
    rightClickPositionX: number | null;
}

export class CinematicEditorTimelineItem extends Component<ICinematicEditorTimelineItemProps, ICinematicEditorTimelineItemState> {
    /**
     * Defines the list of all available key frames in the track.
     */
    public keyFrames: (CinematicEditorTimelineKey | null)[] = [];

    public constructor(props: ICinematicEditorTimelineItemProps) {
        super(props);

        this.state = {
            rightClickPositionX: null,
        };
    }

    public render(): ReactNode {
        this.keyFrames.splice(0, this.keyFrames.length);
        this.keyFrames.length = (this.props.track.keyFrameAnimations?.length ?? 0) + (this.props.track.animationGroups?.length ?? 0);

        return (
            <ContextMenu onOpenChange={(o) => !o && this.setState({ rightClickPositionX: null })}>
                <ContextMenuTrigger>
                    <div
                        onContextMenu={(ev) => this.setState({ rightClickPositionX: ev.nativeEvent.offsetX })}
                        onMouseLeave={() => this.props.cinematicEditor.setState({ selectedTrack: null })}
                        onMouseEnter={() => this.props.cinematicEditor.setState({ selectedTrack: this.props.track })}
                        className={`
                            relative flex items-center w-full h-10 p-2 ring-accent ring-1
                            ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-accent" : ""}
                            transition-all duration-300 ease-in-out
                        `}
                    >
                        <TooltipProvider>
                            {(this.props.track.keyFrameAnimations ?? this.props.track.animationGroups)?.map((key, index) => (
                                <CinematicEditorTimelineKey
                                    key={index}
                                    cinematicKey={key}
                                    scale={this.props.scale}
                                    cinematic={this.props.cinematic}
                                    cinematicTrack={this.props.track}
                                    ref={(r) => this.keyFrames[index] = r}
                                    cinematicEditor={this.props.cinematicEditor}
                                    onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                                    onClicked={() => this.props.cinematicEditor.inspector.setEditedKey(this.props.track, key)}
                                    onMoved={(animationsKeyConfigurationsToMove) => this._onAnimationKeyMoved(animationsKeyConfigurationsToMove)}
                                />
                            ))}

                            {this.state.rightClickPositionX !== null &&
                                <div
                                    style={{
                                        left: `${this.state.rightClickPositionX}px`,
                                    }}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-muted-foreground/35 border-foreground/35 border-2"
                                />
                            }
                        </TooltipProvider>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {this.props.track.animationGroups &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationGroupKey()}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Group Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationGroupKey(this.props.currentTime * this.props.scale)}>
                                <AiOutlinePlus className="w-5 h-5" /> Add Group at Tracker Position
                            </ContextMenuItem>
                        </>
                    }

                    {this.props.track.keyFrameAnimations &&
                        <>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("key")}>
                                <div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
                                Add Key Here
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("cut")}>
                                <div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
                                Add Key Cut Here
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("key", this.props.currentTime * this.props.scale)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] bg-muted-foreground" />
                                Add Key at Tracker Position
                            </ContextMenuItem>
                            <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey("cut", this.props.currentTime * this.props.scale)}>
                                <div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
                                Add Key Cut at Tracker Position
                            </ContextMenuItem>
                        </>
                    }
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    /**
     * Sorts all the keys in the track based on their frame value.
     */
    public sortKeyFrameAnimationsKeys(): void {
        this.props.track.keyFrameAnimations?.sort((a, b) => {
            const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
            const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

            return frameA - frameB;
        });
    }

    /**
     * Adds a new animation key for this track located at the current time selected in
     * the animation editor using the time tracker.
     */
    public addAnimationKey(type: "key" | "cut", positionX?: number | null): void {
        positionX ??= this.state.rightClickPositionX;

        const node = this.props.track.defaultRenderingPipeline
            ? getDefaultRenderingPipeline()
            : this.props.track.node;

        if (positionX === null || !node || !this.props.track.propertyPath) {
            return;
        }

        const frame = Math.round(positionX / this.props.scale);
        const value = getInspectorPropertyValue(node, this.props.track.propertyPath);

        const existingKey = this.props.track.keyFrameAnimations!.find((k) => {
            if (isCinematicKeyCut(k)) {
                return k.key1.frame === frame;
            } else {
                return k.frame === frame;
            }
        });

        if (existingKey) {
            return;
        }

        const key = type === "key"
            ? {
                frame,
                type: "key",
                value: value.clone?.() ?? value,
            } as ICinematicKey
            : {
                type: "cut",
                key1: {
                    frame,
                    value: value.clone?.() ?? value,
                },
                key2: {
                    frame,
                    value: value.clone?.() ?? value,
                },
            } as ICinematicKeyCut;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.track.keyFrameAnimations!.indexOf(key);
                if (index !== -1) {
                    this.props.track.keyFrameAnimations!.splice(index, 1);
                }
            },
            redo: () => this.props.track.keyFrameAnimations!.push(key),
            action: () => {
                this.sortKeyFrameAnimationsKeys();
            },
        });

        this.setState({ rightClickPositionX: null });
    }

    public addAnimationGroupKey(positionX?: number | null): void {
        positionX ??= this.state.rightClickPositionX;

        if (positionX === null || !this.props.track.animationGroup) {
            return;
        }

        const frame = Math.round(positionX / this.props.scale);
        const existingKey = this.props.track.animationGroups!.find((k) => k.frame === frame);

        if (existingKey) {
            return;
        }

        const key = {
            frame,
            type: "group",
            speed: 1,
            startFrame: this.props.track.animationGroup.from,
            endFrame: this.props.track.animationGroup.to,
        } as ICinematicAnimationGroup;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.track.animationGroups!.indexOf(key);
                if (index !== -1) {
                    this.props.track.animationGroups!.splice(index, 1);
                }
            },
            redo: () => this.props.track.animationGroups!.push(key),
            action: () => this.props.track.animationGroups?.sort((a, b) => a.frame - b.frame),
        });

        this.setState({ rightClickPositionX: null });
    }

    private _onAnimationKeyMoved(animationsKeyConfigurationsToMove: ICinematicKeyConfigurationToMove[][]): void {
        const newKeyFrames = animationsKeyConfigurationsToMove.map((configuration) => {
            return configuration.map((key) => {
                if (isCinematicKeyCut(key.key)) {
                    return key.key.key1.frame;
                } else {
                    return key.key.frame;
                }
            });
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                animationsKeyConfigurationsToMove.forEach((trackConfiguration) => {
                    trackConfiguration.forEach((keyConfiguration) => {
                        if (isCinematicKeyCut(keyConfiguration.key)) {
                            keyConfiguration.key.key1.frame = keyConfiguration.startPosition;
                            keyConfiguration.key.key2.frame = keyConfiguration.startPosition;
                        } else {
                            keyConfiguration.key.frame = keyConfiguration.startPosition;
                        }
                    });
                });
            },
            redo: () => {
                animationsKeyConfigurationsToMove.forEach((trackConfigurations, configurationIndex) => {
                    trackConfigurations.forEach((keyConfiguration, keyIndex) => {
                        if (isCinematicKeyCut(keyConfiguration.key)) {
                            keyConfiguration.key.key1.frame = newKeyFrames[configurationIndex][keyIndex];
                            keyConfiguration.key.key2.frame = newKeyFrames[configurationIndex][keyIndex];
                        } else {
                            keyConfiguration.key.frame = newKeyFrames[configurationIndex][keyIndex];
                        }
                    });
                });
            },
            action: () => {
                this.props.cinematic.tracks.forEach((track) => {
                    track.animationGroups?.sort((a, b) => a.frame - b.frame);
                    track.keyFrameAnimations?.sort((a, b) => {
                        const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
                        const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

                        return frameA - frameB;
                    });
                });
            },
        });

        this.forceUpdate();
    }

    private _onAnimationKeyRemoved(key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup): void {
        if (isCinematicGroup(key)) {
            const index = this.props.track.animationGroups!.indexOf(key);
            if (index === -1) {
                return;
            }

            registerUndoRedo({
                executeRedo: true,
                undo: () => this.props.track.animationGroups!.splice(index, 0, key),
                redo: () => this.props.track.animationGroups!.splice(index, 1),
            });
        } else {
            const index = this.props.track.keyFrameAnimations!.indexOf(key);
            if (index === -1) {
                return;
            }

            registerUndoRedo({
                executeRedo: true,
                undo: () => this.props.track.keyFrameAnimations!.splice(index, 0, key),
                redo: () => this.props.track.keyFrameAnimations!.splice(index, 1),
            });
        }
        this.forceUpdate();
    }
}
