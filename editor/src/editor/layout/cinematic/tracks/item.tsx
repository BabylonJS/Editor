import { Component, ReactNode } from "react";
import { HiOutlineTrash } from "react-icons/hi";

import { Button } from "../../../../ui/shadcn/ui/button";

import { ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorTrackItemProps {
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;

    onRemove: (animation: ICinematicTrack) => void;
}

export class CinematicEditorTrackItem extends Component<ICinematicEditorTrackItemProps> {
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
                <div>
                    {this.props.track.propertyPath ?? "No property"}
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
}
