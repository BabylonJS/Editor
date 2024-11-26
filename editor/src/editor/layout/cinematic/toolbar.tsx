import { IoPlay, IoStop } from "react-icons/io5";
import { Component, ReactNode } from "react";

import { Button } from "../../../ui/shadcn/ui/button";
import { Slider } from "../../../ui/shadcn/ui/slider";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "../../../ui/shadcn/ui/menubar";

import { Editor } from "../../main";

import { CinematicEditor } from "./editor";

export interface IEditorAnimationToolbarProps {
    editor: Editor;
    playing: boolean;
    cinematicEditor: CinematicEditor;
}

export class CinematicEditorToolbar extends Component<IEditorAnimationToolbarProps> {
    public render(): ReactNode {
        return (
            <div className="flex justify-between items-center w-full h-10 bg-primary-foreground">
                <Menubar className="border-none rounded-none pl-3 my-auto bg-primary-foreground h-10">
                    {/* File */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            File
                        </MenubarTrigger>

                        <MenubarContent className="border-black/50">
                            <MenubarItem>
                                Load From File...
                            </MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem onClick={() => this.props.cinematicEditor.save()}>
                                Save
                            </MenubarItem>
                            <MenubarItem onClick={() => this.props.cinematicEditor.saveAs()}>
                                Save As...
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Edit */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Edit
                        </MenubarTrigger>

                        <MenubarContent className="border-black/50">
                            <MenubarItem disabled onClick={() => this.props.cinematicEditor.timelines.addKeysAtCurrentTrackerPosition()}>
                                Add Key Frames At Current Time
                            </MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem className="text-red-500" onClick={() => this.props.cinematicEditor.timelines.removeKeysAtCurrentTrackerPosition()}>
                                Remove Key Frames At Current Tracker Position
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Render */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Render
                        </MenubarTrigger>

                        <MenubarContent className="border-black/50">
                            <MenubarItem onClick={() => this.props.cinematicEditor.renderCinematic("720p")}>
                                Render 720p
                            </MenubarItem>
                            <MenubarItem onClick={() => this.props.cinematicEditor.renderCinematic("1080p")}>
                                Render 1080p
                            </MenubarItem>
                            <MenubarItem onClick={() => this.props.cinematicEditor.renderCinematic("4k")}>
                                Render 4K
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>

                {/* Buttons */}
                <div className="flex gap-2 items-center pr-2">
                    <Slider min={0.1} max={20} step={0.01} className="w-32" value={[this.props.cinematicEditor.timelines?.state.scale]} onValueChange={(v) => {
                        this.props.cinematicEditor.timelines?.setScale(v[0]);
                    }} />

                    <Button
                        variant="ghost"
                        disabled={!this.props.playing}
                        onClick={() => this.props.cinematicEditor.stop()}
                        className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
                    >
                        <IoStop className="w-6 h-6" strokeWidth={1} color="green" />
                    </Button>

                    <Button
                        variant="ghost"
                        disabled={this.props.playing}
                        onClick={() => this.props.cinematicEditor.play()}
                        className="w-8 h-8 p-1 disabled:opacity-25 transition-all duration-150 ease-in-out"
                    >
                        <IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
                    </Button>
                </div>
            </div>
        );
    }
}
