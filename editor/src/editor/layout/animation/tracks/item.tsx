import { Component, ReactNode } from "react";

import { Animation } from "babylonjs";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationTrackItemProps {
    animation: Animation;
    animationEditor: EditorAnimation;
}

export class EditorAnimationTrackItem extends Component<IEditorAnimationTrackItemProps> {
    public render(): ReactNode {
        return (
            <div
                onMouseLeave={() => this.props.animationEditor.setState({ selectedAnimation: null })}
                onMouseEnter={() => this.props.animationEditor.setState({ selectedAnimation: this.props.animation })}
                className={`
                    flex items-center w-full h-10 p-2 ring-accent ring-1
                    ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "bg-accent" : ""}
                    transition-all duration-300 ease-in-out
                `}
            >
                {this.props.animation.targetProperty}
            </div>
        );
    }
}
