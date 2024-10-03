import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";

import { Editor } from "../../../main";

import { ICinematic, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

import { CinematicEditorTrackItem } from "./property-item";
import { CinematicEditorAnimationGroupTrackItem } from "./animation-group-item";

export interface ICinematicEditorTracksPanelProps {
    editor: Editor;
    cinematic: ICinematic;
    cinematicEditor: CinematicEditor;
}

export class CinematicEditorTracksPanel extends Component<ICinematicEditorTracksPanelProps> {
    public render(): ReactNode {
        return (
            <div className="flex flex-col w-96 h-full">
                <div className="flex justify-between items-center w-full h-10 p-2">
                    <div className="font-thin text-muted-foreground">
                        ({this.props.cinematic.tracks.length} tracks)
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="ghost" className="w-8 h-8 p-1">
                                <AiOutlinePlus className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => this._handleAddPropertyTrack()}>
                                Property Track
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => this._handleAddAnimationGroupTrack()}>
                                Animation Group Track
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>

                <div className="flex flex-col w-full">
                    {this.props.cinematic.tracks.map((track, index) => {
                        if (track.keyFrameAnimations) {
                            return <CinematicEditorTrackItem
                                key={`${track.propertyPath}${index}`}
                                track={track}
                                editor={this.props.editor}
                                cinematic={this.props.cinematic}
                                cinematicEditor={this.props.cinematicEditor}
                                onRemove={(track) => this._handleRemoveTrack(track)}
                            />;
                        }

                        return <CinematicEditorAnimationGroupTrackItem
                            key={`${track.animationGroup?.name}${index}`}
                            track={track}
                            editor={this.props.editor}
                            cinematicEditor={this.props.cinematicEditor}
                            onRemove={(track) => this._handleRemoveTrack(track)}
                        />;
                    })}
                </div>
            </div>
        );
    }

    private _handleAddPropertyTrack(): void {
        const track = {
            node: null,
            propertyPath: "",
            keyFrameAnimations: [],
        } as ICinematicTrack;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.cinematic.tracks.indexOf(track);
                if (index !== -1) {
                    this.props.cinematic.tracks.splice(index, 1);
                }
            },
            redo: () => this.props.cinematic.tracks.push(track),
        });

        this.forceUpdate();
    }

    private _handleAddAnimationGroupTrack(): void {
        const track = {
            animationGroups: [],
        } as ICinematicTrack;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                const index = this.props.cinematic.tracks.indexOf(track);
                if (index !== -1) {
                    this.props.cinematic.tracks.splice(index, 1);
                }
            },
            redo: () => this.props.cinematic.tracks.push(track),
        });

        this.forceUpdate();
    }

    private _handleRemoveTrack(track: ICinematicTrack): void {
        const index = this.props.cinematic.tracks?.indexOf(track) ?? -1;
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                this.props.cinematic.tracks.splice(index, 0, track);
            },
            redo: () => {
                this.props.cinematic.tracks.splice(index, 1);
            },
        });

        this.props.cinematicEditor.forceUpdate();
    }
}
