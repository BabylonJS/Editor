import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { Tools } from "../../../../editor/tools/tools";

import { InspectorList } from "../../../../editor/gui/inspector/fields/list";

import { ICinematicTrack } from "../../../../editor/cinematic/base";
import { CinematicTrackType } from "../../../../editor/cinematic/track";

import { Tracks } from "../../panels/tracks";

export interface ICinematicInspectorGroupSelectorProps {
    /**
     * Defines the reference to the track.
     */
    track: ICinematicTrack;
    /**
     * Defines the reference to the tracks panel.
     */
    tracks: Nullable<Tracks>;
}

export interface ICinematicInspectorGroupSelectorState {

}

export class CinematicInspectorGroupSelector extends React.Component<ICinematicInspectorGroupSelectorProps, ICinematicInspectorGroupSelectorState> {
    protected _group: Nullable<string> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.props.tracks) {
            return undefined;
        }

        const groups = this.props.tracks.props.cinematic.tracks.filter((t) => t.type === CinematicTrackType.Group);
        this._group = groups.find((g) => g.group!.tracks.indexOf(this.props.track) !== -1)?.group?.name ?? null;

        return <InspectorList key={Tools.RandomId()} object={this} property="_group" label="Track Group" noUndoRedo items={() => {
            return [
                { label: "Undefined", data: null },
                ...groups.map((g) => ({
                    data: g.group!.name,
                    label: g.group!.name,
                })),
            ];
        }} onFinishChange={(r) => {
            this._handleTrackGroupChanged(r);
        }} />
    }

    /**
     * Called on the user changes the group of the track.
     */
    private _handleTrackGroupChanged(groupName: Nullable<string>): void {
        if (!this.props.tracks) {
            return;
        }

        const groups = this.props.tracks.props.cinematic.tracks.filter((t) => t.type === CinematicTrackType.Group);

        const targetGroup = groups.find((g) => g.group!.name === groupName);
        const currentGroup = groups.find((g) => g.group!.tracks.indexOf(this.props.track) !== -1);

        // Remove from current group.
        if (currentGroup) {
            const index = currentGroup.group!.tracks.indexOf(this.props.track);
            if (index !== -1) {
                currentGroup.group!.tracks.splice(index, 1);
            }
        } else {
            const index = this.props.tracks.props.cinematic.tracks.indexOf(this.props.track);
            if (index !== -1) {
                this.props.tracks.props.cinematic.tracks.splice(index, 1);
            }
        }

        // Add to target group
        if (targetGroup) {
            targetGroup.group!.tracks.push(this.props.track);
        } else {
            this.props.tracks.props.cinematic.tracks.push(this.props.track);
        }

        // Refresh
        const cinematicEditor = this.props.tracks?.props.cinematicEditor;
        cinematicEditor?._tracks?.props.cinematicEditor.refreshAll();
    }
}
