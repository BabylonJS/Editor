import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { InspectorString } from "../../../editor/gui/inspector/fields/string";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { Tools } from "../../../editor/tools/tools";

import { Inspector, IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { ICinematicTrack } from "../../../editor/cinematic/base";

import { Tracks } from "../panels/tracks";

export class CinematicGroupTrack {
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

export interface ICinematicGroupTrackInspectorState {
    // Nothing for now...
}

export class CinematicGroupTrackInspector extends AbstractInspector<CinematicGroupTrack, ICinematicGroupTrackInspectorState> {
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
            <InspectorSection title="Group">
                <InspectorString object={this.selectedObject.track.group} property="name" label="Name" onFinishChange={() => {
                    this.selectedObject.tracks?.props.cinematicEditor.refreshAll();
                }} />
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: CinematicGroupTrackInspector,
    ctorNames: ["CinematicGroupTrack"],
    title: "Group Track",
});
