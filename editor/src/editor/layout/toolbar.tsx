import { Component, ReactNode } from "react";

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../ui/shadcn/ui/menubar";

import { saveProject } from "../../project/save/save";

import { Editor } from "../main";

export interface IEditorToolbarProps {
    editor: Editor;
}

export class EditorToolbar extends Component<IEditorToolbarProps> {
    public render(): ReactNode {
        return (
            <div className="w-screen h-10 bg-[#444444]">
                <Menubar className="bg-[#444444] text-white/75 border-none rounded-none">
                    {/* File */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            File
                        </MenubarTrigger>
                        <MenubarContent className="bg-[#444444] text-white/75 border-black/50">
                            <MenubarItem onClick={() => saveProject(this.props.editor)}>
                                Save <MenubarShortcut>CTRL+S</MenubarShortcut>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Edit */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Edit
                        </MenubarTrigger>
                        <MenubarContent className="bg-[#444444] text-white/75 border-black/50">
                            <MenubarItem>
                                Undo <MenubarShortcut>CTRL+Z</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem>
                                Redo <MenubarShortcut>CTRL+Y</MenubarShortcut>
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem>
                                Select All <MenubarShortcut>CTRL+A</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem>
                                Copy <MenubarShortcut>CTRL+C</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem>
                                Paste <MenubarShortcut>CTRL+V</MenubarShortcut>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Preview */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Preview
                        </MenubarTrigger>
                        <MenubarContent className="bg-[#444444] text-white/75 border-black/50">
                            <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("position")}>
                                Position <MenubarShortcut>CTRL+T</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("rotation")}>
                                Rotation <MenubarShortcut>CTRL+R</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("scaling")}>
                                Scaling <MenubarShortcut>CTRL+W</MenubarShortcut>
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem onClick={() => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera)}>
                                Edit Camera
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            </div >
        );
    }
}
