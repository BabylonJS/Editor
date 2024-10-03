import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { ICinematic, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTimelineItemProps {
    scale: number;
    currentTime: number;
    track: ICinematicTrack;
    cinematic: ICinematic;
    animationEditor: CinematicEditor;
}

export interface ICinematicEditorTimelineItemState {
    rightClickPositionX: number | null;
}

export class CinematicEditorTimelineItem extends Component<ICinematicEditorTimelineItemProps, ICinematicEditorTimelineItemState> {
    public constructor(props: ICinematicEditorTimelineItemProps) {
        super(props);

        this.state = {
            rightClickPositionX: null,
        };
    }

    public render(): ReactNode {
        return (
            <ContextMenu onOpenChange={(o) => !o && this.setState({ rightClickPositionX: null })}>
                <ContextMenuTrigger>
                    <div
                        onContextMenu={(ev) => this.setState({ rightClickPositionX: ev.nativeEvent.offsetX })}
                        onMouseLeave={() => this.props.animationEditor.setState({ selectedTrack: null })}
                        onMouseEnter={() => this.props.animationEditor.setState({ selectedTrack: this.props.track })}
                        className={`
                        relative flex items-center w-full h-10 p-2 ring-accent ring-1
                        ${this.props.animationEditor.state.selectedTrack === this.props.track ? "bg-accent" : ""}
                        transition-all duration-300 ease-in-out
                    `}
                    >
                        <TooltipProvider>
                            {/* {this.props.animation.getKeys().map((key, index) => (
                                <EditorAnimationTimelineKey
                                    key={index}
                                    animationKey={key}
                                    scale={this.props.scale}
                                    animatable={this.props.animatable!}
                                    ref={(r) => this.keyFrames[index] = r}
                                    animationEditor={this.props.animationEditor}
                                    onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                                    onClicked={() => this.props.animationEditor.inspector.setEditedKey(key)}
                                    onMoved={(animationsKeyConfigurationsToMove) => this._onAnimationKeyMoved(animationsKeyConfigurationsToMove)}
                                />
                            ))} */}

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
            </ContextMenu>
        );
    }

    /**
     * Adds a new animation key for this track located at the current time selected in
     * the animation editor using the time tracker.
     */
    public addAnimationKey(_positionX?: number | null): void {

    }
}
