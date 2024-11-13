import { Component, DragEvent, ReactNode } from "react";

import { IoMdCube } from "react-icons/io";
import { FaCamera } from "react-icons/fa";
import { FaLightbulb } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import { PiApertureFill } from "react-icons/pi";
import { MdOutlineQuestionMark } from "react-icons/md";
import { HiOutlineCubeTransparent } from "react-icons/hi";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { isAbstractMesh, isCamera, isLight, isTransformNode } from "../../../../tools/guards/nodes";

import { showAlert } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

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
                <TooltipProvider delayDuration={0} disableHoverableContent>
                    <div className="flex gap-2 items-center w-full">
                        <Tooltip>
                            <TooltipTrigger>
                                <div
                                    onDrop={(ev) => this._handleDrop(ev)}
                                    onDragOver={(ev) => this._handleDragOver(ev)}
                                    onDragLeave={(ev) => this._handleDragLeave(ev)}
                                    className={`
                                        w-8 h-8 p-2 rounded-md
                                        ${this.state.dragOver
                                            ? "bg-accent"
                                            : this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-background" : "bg-secondary"
                                        }
                                        transition-all duration-300 ease-in-out    
                                    `}
                                >
                                    {this._getTargetIcon(this.props.track.node ?? (this.props.track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : null))}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {this.props.track.node?.name ?? (this.props.track.defaultRenderingPipeline ? "Pipeline" : "No object")}
                            </TooltipContent>
                        </Tooltip>

                        {(this.props.track.node || this.props.track.defaultRenderingPipeline) &&
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button variant="ghost" className="w-[12rem]" onClick={() => this._selectPropertyToAnimate()}>
                                        <span className="w-full text-xs whitespace-nowrap overflow-hidden overflow-ellipsis">
                                            {this.props.track.propertyPath?.split(".").pop() ?? "No property"}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {this.props.track.propertyPath ?? "No property"}
                                </TooltipContent>
                            </Tooltip>
                        }
                    </div>
                </TooltipProvider>

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

    private _getTargetIcon(object: any): ReactNode {
        if (object) {
            if (isTransformNode(object)) {
                return <HiOutlineCubeTransparent className="w-4 h-4" />;
            }

            if (isAbstractMesh(object)) {
                return <IoMdCube className="w-4 h-4" />;
            }

            if (isLight(object)) {
                return <FaLightbulb className="w-4 h-4" />;
            }

            if (isCamera(object)) {
                return <FaCamera className="w-4 h-4" />;
            }

            if (object === getDefaultRenderingPipeline()) {
                return <PiApertureFill className="w-4 h-4" />;
            }
        }

        return <MdOutlineQuestionMark className="w-4 h-4" />;
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

        const existingAnimation = this.props.cinematic.tracks?.find((a) => a.node === node && a.propertyPath === property);
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
