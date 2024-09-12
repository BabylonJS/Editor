import { Component, ReactNode } from "react";

import { EditorAnimationToolbar } from "./animation/toolbar";
import { EditorAnimationTimelinePanel } from "./animation/timeline";
import { EditorAnimationPropertiesPanel } from "./animation/properties";

export class EditorAnimation extends Component {
    public render(): ReactNode {
        return (
            <div className="flex flex-col w-full h-full">
                <EditorAnimationToolbar />

                <div className="flex w-full h-full">
                    <EditorAnimationPropertiesPanel />

                    <div className="w-1 h-full bg-primary-foreground" />

                    <EditorAnimationTimelinePanel />
                </div>
            </div>
        );
    }
}
