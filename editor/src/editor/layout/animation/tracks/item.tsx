import { Component, ReactNode } from "react";

import { Animation } from "babylonjs";

export interface IEditorAnimationTrackItemProps {
    animation: Animation;
}

export class EditorAnimationTrackItem extends Component<IEditorAnimationTrackItemProps> {
    public render(): ReactNode {
        return (
            <div className="flex items-center w-full h-10 hover:bg-accent p-2 cursor-pointer ring-accent ring-1 transition-all duration-300 ease-in-out">
                {this.props.animation.targetProperty}
            </div>
        );
    }
}
