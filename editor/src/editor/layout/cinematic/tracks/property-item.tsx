import { HiOutlineTrash } from "react-icons/hi";
import { Component, DragEvent, ReactNode } from "react";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";

import { showAlert } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { Editor } from "../../../main";

import { showAddTrackPrompt } from "../../animation/tracks/add";

import { ICinematic, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTrackItemProps {
    editor: Editor;
    cinematic: ICinematic;
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;

    onRemove: (animation: ICinematicTrack) => void;
}

export interface ICinematicEditorTrackItemState {
    dragOver: boolean;
}

export class CinematicEditorTrackItem extends Component<ICinematicEditorTrackItemProps, ICinematicEditorTrackItemState> {
    public constructor(props: ICinematicEditorTrackItemProps) {
        super(props);

        this.state = {
            dragOver: false,
        };
    }

    public render(): ReactNode {
        return (
            <div
                onMouseLeave={() => this.props.cinematicEditor.setState({ selectedTrack: null })}
                onMouseEnter={() => this.props.cinematicEditor.setState({ selectedTrack: this.props.track })}
                className={`
                    flex justify-between items-center w-full h-10 p-2 ring-accent ring-1
                    ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
            >
                <div className="flex gap-2 items-center w-full">
                    <div
                        onDrop={(ev) => this._handleDrop(ev)}
                        onDragOver={(ev) => this._handleDragOver(ev)}
                        onDragLeave={(ev) => this._handleDragLeave(ev)}
                        className={`
                            w-full p-2 rounded-md
                            ${this.state.dragOver
                                ? "bg-accent"
                                : this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-background" : "bg-secondary"
                            }
                            whitespace-nowrap overflow-hidden overflow-ellipsis
                            transition-all duration-300 ease-in-out    
                        `}
                    >
                        {this.props.track.node?.name ?? (this.props.track.defaultRenderingPipeline ? "Pipeline" : "No object")}
                    </div>

                    {(this.props.track.node || this.props.track.defaultRenderingPipeline) &&
                        <Button variant="ghost" className="w-full whitespace-nowrap overflow-hidden overflow-ellipsis" onClick={() => this._selectPropertyToAnimate()}>
                            {this.props.track.propertyPath ?? "No property"}
                        </Button>
                    }
                </div>

                <Button
                    variant="ghost"
                    className={`
                        w-8 h-8 p-1
                        ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "opacity-100" : "opacity-0"}
                        transition-all duration-300 ease-in-out
                    `}
                    onClick={() => this.props.onRemove(this.props.track)}
                >
                    <HiOutlineTrash className="w-5 h-5" />
                </Button>
            </div>
        );
    }

    private _handleDragOver(ev: DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        this.setState({ dragOver: true });
    }

    private _handleDragLeave(ev: DragEvent<HTMLDivElement>) {
        ev.preventDefault();

        this.setState({ dragOver: false });
    }

    private _handleDrop(ev: DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        const data = JSON.parse(ev.dataTransfer.getData("graph/node")) as string[];
        const node = this.props.editor.layout.preview.scene.getNodeById(data[0]);

        if (node && node !== this.props.track.node) {
            const oldNode = this.props.track.node;
            const oldPropertyPath = this.props.track.propertyPath;
            const oldKeyFrameAnimations = this.props.track.keyFrameAnimations;

            registerUndoRedo({
                executeRedo: true,
                undo: () => {
                    this.props.track.node = oldNode;
                    this.props.track.propertyPath = oldPropertyPath;
                    this.props.track.keyFrameAnimations = oldKeyFrameAnimations;
                },
                redo: () => {
                    this.props.track.node = node;

                    const propertyValue = getInspectorPropertyValue(node, this.props.track.propertyPath!) ?? null;
                    if (propertyValue === null) {
                        this.props.track.propertyPath = undefined;
                        this.props.track.keyFrameAnimations = [];
                    }
                },
            });
        }

        this.forceUpdate();
    }

    private async _selectPropertyToAnimate(): Promise<unknown> {
        const node = this.props.track.defaultRenderingPipeline
            ? getDefaultRenderingPipeline()
            : this.props.track.node;

        if (!node) {
            return;
        }

        const property = await showAddTrackPrompt(node);
        if (!property || property === this.props.track.propertyPath) {
            return;
        }

        const value = getInspectorPropertyValue(node, property);
        if (value === null || value === undefined) {
            return showAlert("Property not found", `The property to animate "${property}" was not found on the object.`);
        }

        const existingAnimation = this.props.cinematic.tracks?.find((a) => a.propertyPath === property);
        if (existingAnimation) {
            return showAlert("Property already animated", `The property "${property}" is already animated and cannot be animated twice.`);
        }

        const oldPropertyPath = this.props.track.propertyPath;
        const oldKeyFrameAnimations = this.props.track.keyFrameAnimations;

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                this.props.track.propertyPath = oldPropertyPath;
                this.props.track.keyFrameAnimations = oldKeyFrameAnimations;
            },
            redo: () => {
                this.props.track.propertyPath = property;
                this.props.track.keyFrameAnimations = [
                    { type: "key", frame: 0, value: value.clone?.() ?? value },
                    { type: "key", frame: 60, value: value.clone?.() ?? value },
                ];
            },
        });

        this.forceUpdate();
    }
}
