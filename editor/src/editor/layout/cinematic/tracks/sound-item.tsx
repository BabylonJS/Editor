import { Component, DragEvent, ReactNode } from "react";

import { HiOutlineTrash } from "react-icons/hi";
import { HiSpeakerWave } from "react-icons/hi2";

import { getSoundById } from "../../../../tools/sound/tools";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { Editor } from "../../../main";

import { ICinematic, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorSoundTrackItemProps {
    editor: Editor;
    cinematic: ICinematic;
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;

    onRemove: (animation: ICinematicTrack) => void;
}

export interface ICinematicEditorSoundTrackItemState {
    dragOver: boolean;
}

export class CinematicEditorSoundTrackItem extends Component<ICinematicEditorSoundTrackItemProps, ICinematicEditorSoundTrackItemState> {
    public constructor(props: ICinematicEditorSoundTrackItemProps) {
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
                                            : this.props.cinematicEditor.state.selectedTrack === this.props.track
                                                ? "bg-background"
                                                : "bg-stone-400 dark:bg-stone-900"
                                        }
                                        transition-all duration-300 ease-in-out    
                                    `}
                                >
                                    <HiSpeakerWave className="w-4 h-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {this.props.track.sound?.name ?? "No sound"}
                            </TooltipContent>
                        </Tooltip>

                        {this.props.track.sound &&
                            <Tooltip>
                                <TooltipTrigger className="flex items-center flex-1">
                                    <Button variant="ghost" className="w-full h-8">
                                        <span className="w-full text-xs whitespace-nowrap overflow-hidden overflow-ellipsis">
                                            {this.props.track.sound?.name ?? "No Sound"}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {this.props.track.sound?.name ?? "No sound"}
                                </TooltipContent>
                            </Tooltip>
                        }

                        {!this.props.track.sound &&
                            <div className="flex-1" />
                        }

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
                </TooltipProvider>
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
        const sound = getSoundById(data[0], this.props.editor.layout.preview.scene);

        if (sound && sound !== this.props.track.sound) {
            const oldSound = this.props.track.node;
            const oldSounds = this.props.track.sounds;

            registerUndoRedo({
                executeRedo: true,
                undo: () => {
                    this.props.track.sound = oldSound;
                    this.props.track.sounds = oldSounds;
                },
                redo: () => {
                    this.props.track.sound = sound;
                    this.props.track.sounds = [];
                },
            });
        }

        this.forceUpdate();
    }
}
