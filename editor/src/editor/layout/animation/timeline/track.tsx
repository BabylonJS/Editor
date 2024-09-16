import { Component, ReactNode } from "react";

import { Animation } from "babylonjs";

import { TooltipProvider } from "../../../../ui/shadcn/ui/tooltip";

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
                    flex items-center w-full h-10 p-2 ring-accent ring-1
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
                        />
                    ))}
                </TooltipProvider>
            </div>
        );
    }
}
