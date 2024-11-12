import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

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
                            <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(false)}>
                                Property Track
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => this._handleAddAnimationGroupTrack()}>
                                Animation Group Track
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true)}>
                                Default Rendering Pipeline
                            </DropdownMenuItem> */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    Default Rendering Pipeline
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "imageProcessing.exposure")}>
                                        Exposure
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "imageProcessing.contrast")}>
                                        Contrast
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "depthOfField.focusDistance")}>
                                        Depth-of-field Focus Distance
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "depthOfField.fStop")}>
                                        Depth-of-field F-Stop
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "depthOfField.lensSize")}>
                                        Depth-of-field Lens Size
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true, "depthOfField.focalLength")}>
                                        Depth-of-field Focal Length
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => this._handleAddPropertyTrack(true)}>
                                        Custom
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
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

    private _handleAddPropertyTrack(defaultRenderingPipeline: boolean, propertyPath?: string): void {
        const track = {
            keyFrameAnimations: [],
            defaultRenderingPipeline,
            propertyPath: propertyPath ?? "",
            node: defaultRenderingPipeline ? getDefaultRenderingPipeline() : null,
        } as ICinematicTrack;

        if (defaultRenderingPipeline && propertyPath) {
            const value = getInspectorPropertyValue(getDefaultRenderingPipeline(), propertyPath);
            if (value !== null && value !== undefined) {
                track.keyFrameAnimations = [
                    { type: "key", frame: 0, value: value.clone?.() ?? value },
                    { type: "key", frame: 60, value: value.clone?.() ?? value },
                ];
            }
        }

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
