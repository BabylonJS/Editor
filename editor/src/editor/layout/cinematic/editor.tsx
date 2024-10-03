import { Component, ReactNode } from "react";

import { Editor } from "../../main";

import { ICinematic, ICinematicTrack } from "./schema/typings";

import { CinematicEditorToolbar } from "./toolbar";
import { CinematicEditorTracksPanel } from "./tracks/tracks";
import { CinematicEditorTimelinePanel } from "./timeline/timeline";

export interface ICinematicEditorProps {
    editor: Editor;
    cinematic: ICinematic;
}

export interface ICinematicEditorState {
    playing: boolean;
    focused: boolean;
    selectedTrack: ICinematicTrack | null;
}

export class CinematicEditor extends Component<ICinematicEditorProps, ICinematicEditorState> {
    public constructor(props: ICinematicEditorProps) {
        super(props);

        this.state = {
            playing: false,
            focused: false,
            selectedTrack: null,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col min-w-full h-full">
                <CinematicEditorToolbar
                    cinematicEditor={this}
                    playing={this.state.playing}
                />

                <div className="flex w-full h-10">
                    <div className="flex justify-center items-center font-semibold w-96 h-full bg-secondary">
                        Tracks
                    </div>

                    <div className="w-1 h-full bg-primary-foreground" />

                    <div className="flex justify-center items-center font-semibold w-full h-full bg-secondary">
                        Timeline
                    </div>
                </div>

                <div
                    onClick={() => this.setState({ focused: true })}
                    onMouseLeave={() => this.setState({ focused: false })}
                    className="relative flex w-full h-full overflow-x-hidden overflow-y-auto"
                >
                    <CinematicEditorTracksPanel
                        cinematicEditor={this}
                        cinematic={this.props.cinematic}
                    />

                    <div className="w-1 h-full bg-primary-foreground" />

                    <CinematicEditorTimelinePanel
                        cinematicEditor={this}
                        editor={this.props.editor}
                        cinematic={this.props.cinematic}
                    />
                </div>
            </div>
        );
    }
}
