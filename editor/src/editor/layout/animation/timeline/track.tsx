import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { Animation, IAnimatable, IAnimationKey } from "babylonjs";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { isCinematicKeyCut } from "../cinematic/guards";
import { ICinematic, ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "../cinematic/typings";

import { EditorAnimation } from "../../animation";

import { EditorAnimationTimelineKey, IAnimationKeyConfigurationToMove, ICinematicKeyConfigurationToMove } from "./key";

export interface IEditorAnimationTimelineItemProps {
    scale: number;
    currentTime: number;
    animation: Animation | null;
    cinematic: ICinematic | null;
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
    cinematicTrack: ICinematicTrack | null;
}

export interface IEditorAnimationTimelineItemState {
    rightClickPositionX: number | null;
}

export class EditorAnimationTimelineItem extends Component<IEditorAnimationTimelineItemProps, IEditorAnimationTimelineItemState> {
    /**
     * Defines the list of all available key frames in the track.
     */
    public keyFrames: (EditorAnimationTimelineKey | null)[] = [];

    public constructor(props: IEditorAnimationTimelineItemProps) {
        super(props);

        this.state = {
            rightClickPositionX: null,
        };
    }

    public render(): ReactNode {
        const cinematicTrackKeysLength =
            this.props.cinematicTrack?.keyFrameAnimations?.length ??
            this.props.cinematicTrack?.keyFrameAnimations?.length ??
            0;

        const keysLength = this.props.animation?.getKeys().length ?? cinematicTrackKeysLength ?? 0;

        this.keyFrames.splice(0, this.keyFrames.length);
        this.keyFrames.length = keysLength;

        return (
            <ContextMenu onOpenChange={(o) => !o && this.setState({ rightClickPositionX: null })}>
                <ContextMenuTrigger>
                    <div
                        onContextMenu={(ev) => this.setState({ rightClickPositionX: ev.nativeEvent.offsetX })}
                        onMouseLeave={() => this.props.animationEditor.setState({ selectedAnimation: null })}
                        onMouseEnter={() => this.props.animationEditor.setState({ selectedAnimation: this.props.animation })}
                        className={`
                            relative flex items-center w-full h-10 p-2 ring-accent ring-1
                            ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "bg-accent" : ""}
                            transition-all duration-300 ease-in-out
                        `}
                    >
                        <TooltipProvider>
                            {this.props.animation && this._getAnimationKeysList(this.props.animation)}
                            {this.props.cinematicTrack && this._getCinematicTrackKeysList(this.props.cinematicTrack)}

                            {this.state.rightClickPositionX &&
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
                    <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey()}>
                        <AiOutlinePlus className="w-5 h-5" /> Add Key Here
                    </ContextMenuItem>
                    <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey(this.props.currentTime * this.props.scale)}>
                        <AiOutlinePlus className="w-5 h-5" /> Add Key at Tracker Position
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu >
        );
    }

    private _getAnimationKeysList(animation: Animation): ReactNode[] {
        return animation.getKeys().map((key, index) => (
            <EditorAnimationTimelineKey
                key={index}
                cinematic={null}
                animationKey={key}
                scale={this.props.scale}
                cinematicAnimationKey={null}
                animatable={this.props.animatable!}
                ref={(r) => this.keyFrames[index] = r}
                animationEditor={this.props.animationEditor}
                onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                onClicked={() => this.props.animationEditor.inspector.setEditedAnimationKey(key)}
                onMoved={(animationsKeyConfigurationsToMove) => this._onAnimationKeyMoved(animationsKeyConfigurationsToMove as IAnimationKeyConfigurationToMove[][])}
            />
        ));
    }

    private _getCinematicTrackKeysList(track: ICinematicTrack): ReactNode[] {
        return track.keyFrameAnimations!.map((key, index) => (
            <EditorAnimationTimelineKey
                key={index}
                animatable={null}
                animationKey={null}
                scale={this.props.scale}
                cinematicAnimationKey={key}
                cinematic={this.props.cinematic}
                ref={(r) => this.keyFrames[index] = r}
                animationEditor={this.props.animationEditor}
                onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                onClicked={() => this.props.animationEditor.inspector.setEditedCinematicKey(key)}
                onMoved={(animationsKeyConfigurationsToMove) => this._onAnimationKeyMoved(animationsKeyConfigurationsToMove as ICinematicKeyConfigurationToMove[][])}
            />
        ));
    }

    /**
     * Adds a new animation key for this track located at the current time selected in
     * the animation editor using the time tracker.
     */
    public addAnimationKey(positionX?: number | null): void {
        if (this.props.animation) {
            this._addAnimationKey(positionX);
        }

        if (this.props.cinematicTrack) {
            // TODO: add cinematic track key
        }
    }

    private _addAnimationKey(positionX?: number | null): void {
        positionX ??= this.state.rightClickPositionX;

        if (positionX === null) {
            return;
        }

        const value = getInspectorPropertyValue(this.props.animatable, this.props.animation!.targetProperty);

        const key = {
            value: value.clone?.() ?? value,
            frame: Math.round(positionX / this.props.scale),
        } as IAnimationKey;

        const existingKey = this.props.animation!.getKeys().find((k) => k.frame === key.frame);
        if (existingKey) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.animation!.getKeys().indexOf(key);
                if (index !== -1) {
                    this.props.animation!.getKeys().splice(index, 1);
                }
            },
            redo: () => this.props.animation!.getKeys().push(key),
            action: () => this.props.animation!.getKeys().sort((a, b) => a.frame - b.frame),
        });

        this.setState({ rightClickPositionX: null });
    }

    private _onAnimationKeyMoved(animationsKeyConfigurationsToMove: (IAnimationKeyConfigurationToMove | ICinematicKeyConfigurationToMove)[][]): void {
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
                animationsKeyConfigurationsToMove.forEach((configurations) => {
                    configurations.forEach((configuration) => {
                        if (isCinematicKeyCut(configuration.key)) {
                            configuration.key.key1.frame = configuration.startPosition;
                            configuration.key.key2.frame = configuration.startPosition;
                        } else {
                            configuration.key.frame = configuration.startPosition;
                        }
                    });
                });
            },
            redo: () => {
                animationsKeyConfigurationsToMove.forEach((configurations, configurationIndex) => {
                    configurations.forEach((configuration, keyIndex) => {
                        if (isCinematicKeyCut(configuration.key)) {
                            configuration.key.key1.frame = newKeyFrames[configurationIndex][keyIndex];
                            configuration.key.key2.frame = newKeyFrames[configurationIndex][keyIndex];
                        } else {
                            configuration.key.frame = newKeyFrames[configurationIndex][keyIndex];
                        }
                    });
                });
            },
            action: () => {
                this.props.animatable?.animations?.forEach((animation) => {
                    animation.getKeys().sort((a, b) => a.frame - b.frame);
                });

                this.props.cinematic?.tracks.forEach((track) => {
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

    private _onAnimationKeyRemoved(key: IAnimationKey | ICinematicKey | ICinematicKeyCut): void {
        if (this.props.animation) {
            return this._removeAnimationKey(key as IAnimationKey);
        }

        if (this.props.cinematicTrack) {
            return this._removeCinematicKey(key as ICinematicKey | ICinematicKeyCut);
        }
    }

    private _removeAnimationKey(key: IAnimationKey): void {
        const keys = this.props.animation!.getKeys();

        const index = keys.indexOf(key);
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => keys.splice(index, 0, key),
            redo: () => keys.splice(index, 1),
        });

        this.forceUpdate();
    }

    private _removeCinematicKey(key: ICinematicKey | ICinematicKeyCut): void {
        const keys = this.props.cinematicTrack?.keyFrameAnimations ?? this.props.cinematicTrack?.animationGroups;
        if (!keys) {
            return;
        }

        const keyFramesIndex = this.props.cinematicTrack!.keyFrameAnimations?.indexOf(key);
        if (keyFramesIndex !== undefined && keyFramesIndex !== -1) {
            registerUndoRedo({
                executeRedo: true,
                undo: () => keys.splice(keyFramesIndex, 0, key),
                redo: () => keys.splice(keyFramesIndex, 1),
            });
        }

        this.forceUpdate();
    }
}
