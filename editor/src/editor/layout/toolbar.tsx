import { platform } from "os";
import { ipcRenderer } from "electron";
import { dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import { IoCloseOutline } from "react-icons/io5";
import { VscChromeMinimize, VscMultipleWindows } from "react-icons/vsc";

import { Button } from "../../ui/shadcn/ui/button";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../ui/shadcn/ui/menubar";

import { execNodePty } from "../../tools/node-pty";
import { openSingleFileDialog } from "../../tools/dialog";

import { showConfirm } from "../../ui/dialog";

import { saveProject } from "../../project/save/save";
import { exportProject } from "../../project/export/export";

import { Editor } from "../main";

const isWin32 = platform() === "win32";
const isDarwin = platform() === "darwin";

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
        return (
            <>
                {isDarwin &&
                    <div className="absolute top-0 left-0 w-screen h-10 electron-draggable" />
                }

                {(!isDarwin || process.env.DEBUG) &&
                    this._getToolbar()
                }
            </>
        );
    }

    private _getToolbar(): ReactNode {
        return (
            <div className="flex justify-between w-screen h-12 bg-background text-foreground">
                <Menubar className="border-none rounded-none pl-3 my-auto">
                    <img alt="" src="assets/babylonjs_icon.png" className="w-6 object-contain" />

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
                    <div className="flex z-50 pr-3 my-auto">
                        <Button variant="ghost" className="w-12 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:minimize")}>
                            <VscChromeMinimize className="w-5 h-5" />
                        </Button>

                        <Button variant="ghost" className="w-12 aspect-square !p-4 hover:bg-muted" onClick={() => ipcRenderer.send("window:maximize")}>
                            <VscMultipleWindows className="w-5 h-5" />
                        </Button>

                        <Button variant="ghost" className="w-12 aspect-square !p-0 hover:bg-muted" onClick={() => ipcRenderer.send("window:close")}>
                            <IoCloseOutline className="w-5 h-5" />
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
