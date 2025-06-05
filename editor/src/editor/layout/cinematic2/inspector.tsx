import { Component, ReactNode } from "react";

import { Tools } from "babylonjs";
import { ICinematicTrack, isCinematicKey, isCinematicKeyCut, isCinematicSound, isCinematicGroup } from "babylonjs-editor-tools";

import { CinematicEditor } from "./editor";

import { CinematicEditorKeyInspector } from "./inspector/key";
import { CinematicEditorKeyCutInspector } from "./inspector/key-cut";
import { CinematicEditorSoundKeyInspector } from "./inspector/sound";
import { CinematicEditorAnimationGroupKeyInspector } from "./inspector/animation-group";

export interface ICinematicEditorInspectorProps {
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorInspectorState {
    editedObject: any;
    editedTrack: ICinematicTrack | null;
}

export class CinematicEditorInspector extends Component<ICinematicEditorInspectorProps, ICinematicEditorInspectorState> {
    public constructor(props: ICinematicEditorInspectorProps) {
        super(props);

        this.state = {
            editedTrack: null,
            editedObject: null,
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col gap-2 w-96 h-full p-2 text-foreground overflow-y-auto">
                {this._getComponent()}
            </div>
        );
    }

    public setEditedObject(editedObject: any, editedTrack: ICinematicTrack): void {
        this.setState({
            editedTrack,
            editedObject,
        });
    }

    private _getComponent(): ReactNode {
        if (!this.state.editedObject || !this.state.editedTrack) {
            return null;
        }

        if (isCinematicKey(this.state.editedObject)) {
            return <CinematicEditorKeyInspector
                key={Tools.RandomId()}
                title="Key"
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicKeyCut(this.state.editedObject)) {
            return <CinematicEditorKeyCutInspector
                key={Tools.RandomId()}
                title="Cut Key"
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicSound(this.state.editedObject)) {
            return <CinematicEditorSoundKeyInspector
                key={Tools.RandomId()}
                title="Sound Key"
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicGroup(this.state.editedObject)) {
            return <CinematicEditorAnimationGroupKeyInspector
                key={Tools.RandomId()}
                title="Animation Group"
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }
    }
}
