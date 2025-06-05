import { Component, ReactNode } from "react";

import { Tools } from "babylonjs";
import { ICinematicTrack, isCinematicKey, isCinematicKeyCut, isCinematicSound, isCinematicGroup, isCinematicKeyEvent } from "babylonjs-editor-tools";

import { CinematicEditor } from "./editor";

import { CinematicEditorKeyInspector } from "./inspector/key";
import { CinematicEditorKeyCutInspector } from "./inspector/key-cut";
import { CinematicEditorSoundKeyInspector } from "./inspector/sound";
import { CinematicEditorAnimationGroupKeyInspector } from "./inspector/animation-group";
import { CinematicEditorEventKeyInspector } from "./inspector/events/event";

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
        const component = this._getComponent();

        if (!component) {
            return (
                <div className="flex justify-center items-center w-96 h-full border-l border-l-border">
                    <div className="text-center text-muted-foreground">Select an object to edit</div>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 w-96 h-full p-2 text-foreground overflow-y-auto">
                {component}
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
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicKeyCut(this.state.editedObject)) {
            return <CinematicEditorKeyCutInspector
                key={Tools.RandomId()}
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicSound(this.state.editedObject)) {
            return <CinematicEditorSoundKeyInspector
                key={Tools.RandomId()}
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicGroup(this.state.editedObject)) {
            return <CinematicEditorAnimationGroupKeyInspector
                key={Tools.RandomId()}
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }

        if (isCinematicKeyEvent(this.state.editedObject)) {
            return <CinematicEditorEventKeyInspector
                key={Tools.RandomId()}
                track={this.state.editedTrack}
                cinematicKey={this.state.editedObject}
                cinematicEditor={this.props.cinematicEditor}
            />;
        }
    }
}
