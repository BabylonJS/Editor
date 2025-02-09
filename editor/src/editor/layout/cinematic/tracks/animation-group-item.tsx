import { Component, ReactNode } from "react";

import { MdAnimation } from "react-icons/md";
import { HiOutlineTrash } from "react-icons/hi";

import { registerUndoRedo } from "../../../../tools/undoredo";

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
                    flex items-center gap-2 w-full h-10 p-2 ring-accent ring-1
                    ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
            >
                <div
                    className={`
                        w-8 h-8 p-2 rounded-md
                        ${this.state.dragOver
                            ? "bg-accent"
                            : this.props.cinematicEditor.state.selectedTrack === this.props.track ? "bg-background" : "bg-secondary-foreground"
                        }
                        transition-all duration-300 ease-in-out    
                    `}
                >
                    <MdAnimation
                        className={`
                            w-4 h-4
                            ${this.props.cinematicEditor.state.selectedTrack === this.props.track ? "" : "invert"}
                            transition-all duration-300 ease-in-out    
                        `}
                    />
                </div>

                <Select
                    value={this.props.track.animationGroup?.name}
                    onValueChange={(v) => this._handleAnimationGroupChanged(v)}
                >
                    <SelectTrigger className="flex-1 h-8 border-none [&>span]:text-center [&>span]:w-full [&>span]:text-xs [&>svg]:invisible [&>svg]:hover:visible">
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

    private _handleAnimationGroupChanged(name: string): void {
        const animationGroup = this.props.editor.layout.preview.scene.getAnimationGroupByName(name);
        if (!animationGroup) {
            return;
        }

        const oldAnimationGroup = this.props.track.animationGroup;

        registerUndoRedo({
            executeRedo: true,
            undo: () => this.props.track.animationGroup = oldAnimationGroup,
            redo: () => this.props.track.animationGroup = animationGroup,
        });

        this.props.cinematicEditor.forceUpdate();
    }
}
