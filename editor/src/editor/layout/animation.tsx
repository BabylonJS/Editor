import { Component, ReactNode } from "react";

import { IAnimatable } from "babylonjs";

import { EditorAnimationToolbar } from "./animation/toolbar";
import { EditorAnimationTimelinePanel } from "./animation/timeline";
import { EditorAnimationTracksPanel } from "./animation/tracks/tracks";

import { isNode } from "../../tools/guards/nodes";

import { Editor } from "../main";

export interface IEditorAnimationProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export interface IEditorAnimationState {
    animatable: IAnimatable | null;
}

const isEnabled = false;

export class EditorAnimation extends Component<IEditorAnimationProps, IEditorAnimationState> {
    public constructor(props: IEditorAnimationProps) {
        super(props);

        this.state = {
            animatable: null,
        };
    }

    public render(): ReactNode {
        if (!isEnabled) {
            return (
                <div className="flex justify-center items-center w-full h-full font-semibold text-3xl">
                    Coming Soon
                </div>
            );
        }

        return (
            <div className="flex flex-col w-full h-full">
                <EditorAnimationToolbar />

                <div className="flex w-full h-10">
                    <div className="flex justify-center items-center font-semibold w-96 h-full bg-secondary">
                        Tracks
                    </div>

                    <div className="w-1 h-full bg-primary-foreground" />

                    <div className="flex justify-center items-center font-semibold w-full h-full bg-secondary">
                        Timeline
                    </div>
                </div>

                <div className="flex w-full h-full">
                    <EditorAnimationTracksPanel animatable={this.state.animatable} />

                    <div className="w-1 h-full bg-primary-foreground" />

                    <EditorAnimationTimelinePanel animatable={this.state.animatable} />
                </div>
            </div>
        );
    }

    /**
     * Sets the reference to the edited object, selected somewhere in the graph or the preview, to edit its animations.
     * @param object defines the reference to the object that has been selected somewhere in the graph or the preview.
     */
    public setEditedObject(object: unknown): void {
        if (isNode(object)) {
            if (!object.animations) {
                object.animations = [];
            }

            this.setState({ animatable: object });
        }
    }
}
