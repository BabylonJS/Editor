import { Component, ReactNode } from "react";
import { HiOutlineTrash } from "react-icons/hi";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { Editor } from "../../../main";

import { ICinematicTrack } from "../schema/typings";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorAnimationGroupTrackItemProps {
    editor: Editor;
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;

    onRemove: (animation: ICinematicTrack) => void;
}

export interface ICinematicEditorAnimationGroupTrackItemState {
    dragOver: boolean;
}

export class CinematicEditorAnimationGroupTrackItem extends Component<ICinematicEditorAnimationGroupTrackItemProps, ICinematicEditorAnimationGroupTrackItemState> {
    public constructor(props: ICinematicEditorAnimationGroupTrackItemProps) {
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
                <Select value={this.props.track.animationGroup?.name}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Animation Group..." />
                    </SelectTrigger>
                    <SelectContent>
                        {this.props.editor.layout.preview.scene.animationGroups.map((animationGroup, index) => (
                            <SelectItem key={`${animationGroup.name}${index}`} value={animationGroup.name}>
                                {animationGroup.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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
