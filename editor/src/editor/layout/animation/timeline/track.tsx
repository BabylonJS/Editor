import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { Animation, IAnimatable, IAnimationKey } from "babylonjs";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../../ui/shadcn/ui/context-menu";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { EditorAnimation } from "../../animation";

import { EditorAnimationTimelineKey } from "./key";

export interface IEditorAnimationTimelineItemProps {
    scale: number;
    animation: Animation;
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationTimelineItemState {
    // ...
}

export class EditorAnimationTimelineItem extends Component<IEditorAnimationTimelineItemProps, IEditorAnimationTimelineItemState> {
    private _rightClickPositionX: number | null = null;

    public constructor(props: IEditorAnimationTimelineItemProps) {
        super(props);

        this.state = {
            scale: 1,
        };
    }

    public render(): ReactNode {
        return (
            <ContextMenu onOpenChange={(o) => !o && (this._rightClickPositionX = null)}>
                <ContextMenuTrigger>
                    <div
                        onContextMenu={(ev) => this._rightClickPositionX = ev.nativeEvent.offsetX}
                        onMouseLeave={() => this.props.animationEditor.setState({ selectedAnimation: null })}
                        onMouseEnter={() => this.props.animationEditor.setState({ selectedAnimation: this.props.animation })}
                        className={`
                            relative flex items-center w-full h-10 p-2 ring-accent ring-1
                            ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "bg-accent" : ""}
                            transition-all duration-300 ease-in-out
                        `}
                    >
                        <TooltipProvider>
                            {this.props.animation.getKeys().map((key, index) => (
                                <EditorAnimationTimelineKey
                                    key={index}
                                    animationKey={key}
                                    scale={this.props.scale}
                                    animationEditor={this.props.animationEditor}
                                    onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                                    onClicked={() => this.props.animationEditor.inspector.setEditedKey(key)}
                                    onMoved={(key, newFrame, oldFrame) => this._onAnimationKeyMoved(key, newFrame, oldFrame)}
                                />
                            ))}
                        </TooltipProvider>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem className="flex items-center gap-2" onClick={() => this.addAnimationKey()}>
                        <AiOutlinePlus className="w-5 h-5" /> Add Key
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu >
        );
    }

    /**
     * Adds a new animation key for this track located at the current time selected in
     * the animation editor using the time tracker.
     */
    public addAnimationKey(positionX?: number | null): void {
        positionX ??= this._rightClickPositionX;

        if (positionX === null) {
            return;
        }

        const value = getInspectorPropertyValue(this.props.animatable, this.props.animation.targetProperty);

        const key = {
            value: value.clone?.() ?? value,
            frame: Math.round(positionX / this.props.scale),
        } as IAnimationKey;

        const existingKey = this.props.animation.getKeys().find((k) => k.frame === key.frame);
        if (existingKey) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.animation.getKeys().indexOf(key);
                if (index !== -1) {
                    this.props.animation.getKeys().splice(index, 1);
                }
            },
            redo: () => this.props.animation.getKeys().push(key),
            action: () => this.props.animation.getKeys().sort((a, b) => a.frame - b.frame),
        });

        this._rightClickPositionX = null;

        this.forceUpdate();
    }

    private _onAnimationKeyMoved(key: IAnimationKey, newFrame: number, oldFrame: number): void {
        registerUndoRedo({
            executeRedo: true,
            undo: () => key.frame = oldFrame,
            redo: () => key.frame = newFrame,
            action: () => this.props.animation.getKeys().sort((a, b) => a.frame - b.frame),
        });

        this.forceUpdate();
    }

    private _onAnimationKeyRemoved(key: IAnimationKey): void {
        const keys = this.props.animation.getKeys();

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
}
