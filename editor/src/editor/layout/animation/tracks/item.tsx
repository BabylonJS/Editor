import { Component, ReactNode } from "react";
import { HiOutlineTrash } from "react-icons/hi";

import { Animation } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorAnimation } from "../../animation";
import { ICinematicTrack } from "../cinematic/typings";

export interface IEditorAnimationTrackItemProps {
    animation: Animation | null;
    cinematicTrack: ICinematicTrack | null;

    animationEditor: EditorAnimation;

    onRemoveAnimation: (animation: Animation) => void;
}

export class EditorAnimationTrackItem extends Component<IEditorAnimationTrackItemProps> {
    public render(): ReactNode {
        return (
            <div
                onMouseLeave={() => this.props.animationEditor.setState({ selectedAnimation: null })}
                onMouseEnter={() => this.props.animationEditor.setState({ selectedAnimation: this.props.animation })}
                className={`
                    flex justify-between items-center w-full h-10 p-2 ring-accent ring-1
                    ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
            >
                <div>
                    {this._getTitle()}
                </div>

                <Button
                    variant="ghost"
                    onClick={() => this._handleRemove()}
                    className={`
                        w-8 h-8 p-1
                        ${this.props.animationEditor.state.selectedAnimation === this.props.animation ? "opacity-100" : "opacity-0"}
                        transition-all duration-300 ease-in-out
                    `}
                >
                    <HiOutlineTrash className="w-5 h-5" />
                </Button>
            </div>
        );
    }

    private _getTitle(): string {
        if (this.props.animation) {
            return this.props.animation.targetProperty;
        }

        if (this.props.cinematicTrack) {
            if (this.props.cinematicTrack.propertyPath) {
                return this.props.cinematicTrack.propertyPath;
            }

            if (this.props.cinematicTrack.animationGroups) {
                return "Animation Groups";
            }
        }

        return "Unknown property.";
    }

    private _handleRemove(): void {
        if (this.props.animation) {
            this.props.onRemoveAnimation(this.props.animation);
        }
    }
}
