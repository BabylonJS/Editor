import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { Tools } from "../../../editor/tools/tools";

import { Inspector, IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { ICinematicTrack } from "../../../editor/cinematic/base";

import { Tracks } from "../panels/tracks";

import { CinematicInspectorGroupSelector } from "./components/group-selector";

export class CinematicAnimationGroupTrack {
    /**
     * Defines the id of the cinematic animation key object.
     */
    public id: string = Tools.RandomId();

    /**
     * Constructor.
     */
    public constructor(public track: ICinematicTrack, public tracks: Nullable<Tracks>) {
        // Empty for now...
    }
}

export interface ICinematicAnimationGroupTrackInspectorState {
    // Nothing for now...
}

export class CinematicAnimationGroupTrackInspector extends AbstractInspector<CinematicAnimationGroupTrack, ICinematicAnimationGroupTrackInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <InspectorSection title="Animation Group">
                <InspectorList object={this.selectedObject.track.animationGroup} property="name" label="Animation Group" noUndoRedo items={() => {
                    return this.props.editor.scene?.animationGroups.map((c) => ({ data: c.name, label: c.name })) ?? [];
                }} onChange={() => {
                    this.selectedObject.tracks?.props.cinematicEditor.refreshAll();
                }} />

                <CinematicInspectorGroupSelector track={this.selectedObject.track} tracks={this.selectedObject.tracks} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: CinematicAnimationGroupTrackInspector,
    ctorNames: ["CinematicAnimationGroupTrack"],
    title: "Animation Group Track",
});
