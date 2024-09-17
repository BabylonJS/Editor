import { Component, ReactNode } from "react";

import { Animation, IAnimationKey } from "babylonjs";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorAnimation } from "../../animation";

import { EditorAnimationTimelineKey } from "./key";

export interface IEditorAnimationTimelineItemProps {
    scale: number;
    animation: Animation;
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationTimelineItemState {
    // ...
}

export class EditorAnimationTimelineItem extends Component<IEditorAnimationTimelineItemProps, IEditorAnimationTimelineItemState> {
    public constructor(props: IEditorAnimationTimelineItemProps) {
        super(props);

        this.state = {
            scale: 1,
        };
    }

    public render(): ReactNode {
        return (
            <div
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
                            onRemoved={(key) => this._onAnimationKeyRemoved(key)}
                            onMoved={(key, newFrame, oldFrame) => this._onAnimationKeyMoved(key, newFrame, oldFrame)}
                        />
                    ))}
                </TooltipProvider>
            </div>
        );
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
