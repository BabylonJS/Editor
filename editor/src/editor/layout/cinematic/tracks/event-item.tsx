import { Component, ReactNode } from "react";

import { IoIosRocket } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";

import { Button } from "../../../../ui/shadcn/ui/button";

import { Editor } from "../../../main";

import { ICinematic, ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorEventTrackItemProps {
    editor: Editor;
    cinematic: ICinematic;
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;

    onRemove: (animation: ICinematicTrack) => void;
}

export interface ICinematicEditorEventTrackItemState {

}

export class CinematicEditorEventTrackItem extends Component<ICinematicEditorEventTrackItemProps, ICinematicEditorEventTrackItemState> {
    public constructor(props: ICinematicEditorEventTrackItemProps) {
        super(props);

        this.state = {

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
                        className={`
                            w-8 h-8 p-2 rounded-md
                            ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-background" : "bg-secondary"}
                            transition-all duration-300 ease-in-out
                        `}
                    >
                        <IoIosRocket className="w-4 h-4" />
                    </div>

                    <span className="w-full text-xs text-center">
                        Events
                    </span>

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
            </div>
        );
    }
}
