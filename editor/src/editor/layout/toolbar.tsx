import { platform } from "os";
import { ipcRenderer } from "electron";
import { dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import { IoCloseOutline } from "react-icons/io5";
import { VscChromeMinimize } from "react-icons/vsc";
import { FaRegWindowMaximize } from "react-icons/fa";

import { Button } from "../../ui/shadcn/ui/button";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../ui/shadcn/ui/menubar";

import { execNodePty } from "../../tools/node-pty";
import { openSingleFileDialog } from "../../tools/dialog";

import { showConfirm } from "../../ui/dialog";

import { saveProject } from "../../project/save/save";
import { exportProject } from "../../project/export/export";

import { Editor } from "../main";

const isWin32 = platform() === "win32";

export interface IEditorToolbarProps {
    editor: Editor;
}

export class EditorToolbar extends Component<IEditorToolbarProps> {
    public constructor(props: IEditorToolbarProps) {
        super(props);

        ipcRenderer.on("editor:open-project", () => this._handleOpenProject());
        ipcRenderer.on("editor:open-vscode", () => this._handleOpenVisualStudioCode());
    }

    public render(): ReactNode {
        if (platform() === "darwin" && !process.env.DEBUG) {
            return null;
        }

        return (
            <div className="flex justify-between w-screen h-10 bg-background text-foreground">
                <Menubar className="border-none rounded-none">
                    <img alt="" src="assets/babylonjs_icon.png" className="w-5 object-contain" />

                    {/* File */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            File
                        </MenubarTrigger>
                        <MenubarContent className="border-black/50">
                            <MenubarItem onClick={() => this._handleOpenProject()}>
                                Open Project <MenubarShortcut>CTRL+O</MenubarShortcut>
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem onClick={() => saveProject(this.props.editor)}>
                                Save <MenubarShortcut>CTRL+S</MenubarShortcut>
                            </MenubarItem>

                            <MenubarItem onClick={() => exportProject(this.props.editor, true)}>
                                Export <MenubarShortcut>CTRL+G</MenubarShortcut>
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem onClick={() => this._handleOpenVisualStudioCode()}>
                                Open in Visual Studio Code
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Edit */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Edit
                        </MenubarTrigger>
                        <MenubarContent className="border-black/50">
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

                            <MenubarSeparator />

                            <MenubarItem onClick={() => this.props.editor.setState({ editProject: true })}>
                                Project...
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem onClick={() => this.props.editor.setState({ editPreferences: true })}>
                                Preferences...
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>

                    {/* Preview */}
                    <MenubarMenu>
                        <MenubarTrigger>
                            Preview
                        </MenubarTrigger>
                        <MenubarContent className="border-black/50">
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

                            <MenubarItem onClick={() => this.props.editor.layout.preview.focusObject()} className="w-60">
                                Focus Selected Object <MenubarShortcut>CTRL+F</MenubarShortcut>
                            </MenubarItem>

                            <MenubarSeparator />

                            <MenubarItem onClick={() => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera)}>
                                Edit Camera
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>

                <div className="w-full h-10 electron-draggable" />

                {isWin32 &&
                    <div className="flex z-50">
                        <Button variant="ghost" className="w-10 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:minimize")}>
                            <VscChromeMinimize className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" className="w-10 aspect-square hover:bg-muted" onClick={() => ipcRenderer.send("window:maximize")}>
                            <FaRegWindowMaximize className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" className="w-10 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:close")}>
                            <IoCloseOutline className="w-4 h-4" />
                        </Button>
                    </div>
                }
            </div>
        );
    }

    private async _handleOpenProject(): Promise<void> {
        const file = openSingleFileDialog({
            title: "Open Project",
            filters: [
                { name: "BabylonJS Editor Project File", extensions: ["bjseditor"] }
            ],
        });

        if (!file) {
            return;
        }

        const accept = await showConfirm("Are you sure?", "This will close the current project and open the selected one.");
        if (!accept) {
            return;
        }

        this.props.editor.layout.preview.reset();
        this.props.editor.openProject(file);
    }

    private async _handleOpenVisualStudioCode(): Promise<void> {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        const p = await execNodePty(`code "${join(dirname(this.props.editor.state.projectPath), "/")}"`);
        await p.wait();
    }
}
