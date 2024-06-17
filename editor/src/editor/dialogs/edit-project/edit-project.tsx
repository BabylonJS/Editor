import { shell } from "electron";
import { join } from "path/posix";

import { Component, ReactNode } from "react";

import { AiOutlinePlus } from "react-icons/ai";
import { IoOpenOutline } from "react-icons/io5";

import { openSingleFileDialog, openSingleFolderDialog } from "../../../tools/dialog";

import { Label } from "../../../ui/shadcn/ui/label";
import { Button } from "../../../ui/shadcn/ui/button";
import { Switch } from "../../../ui/shadcn/ui/switch";
import { Separator } from "../../../ui/shadcn/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../ui/shadcn/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

import { saveProject } from "../../../project/save/save";

import { EditorEditProjectPluginComponent } from "./plugin";

export interface IEditorEditProjectComponentProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
    /**
     * Defines if the dialog is open.
     */
    open: boolean;
    onClose: () => void;
}

export class EditorEditProjectComponent extends Component<IEditorEditProjectComponentProps> {
    public render(): ReactNode {
        return (
            <AlertDialog open={this.props.open}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Edit Project
                        </AlertDialogTitle>
                        <AlertDialogDescription className="py-5">
                            <Tabs defaultValue="editor" className="w-full">
                                <TabsList className="w-full">
                                    <TabsTrigger className="w-full" value="editor">Editor</TabsTrigger>
                                    <TabsTrigger className="w-full" value="plugins">Plugins</TabsTrigger>
                                </TabsList>

                                <TabsContent value="editor">{this._getEditorComponent()}</TabsContent>
                                <TabsContent value="plugins">{this._getPluginsComponent()}</TabsContent>
                            </Tabs>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="w-20" onClick={() => this.props.onClose()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="w-20" onClick={() => this._handleSave()}>Save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    private _handleSave(): void {
        saveProject(this.props.editor);
        this.props.onClose();
    }

    private _getEditorComponent(): ReactNode {
        return (
            <div className="flex flex-col gap-[10px] w-full mt-[10px]">
                <Separator />

                <div className="flex justify-between items-center gap-1">
                    Compress textures using PVRTexTool CLI.

                    <Button variant="secondary" className="flex items-center gap-[5px]" onClick={() => shell.openExternal("https://www.imaginationtech.com/")}>
                        <IoOpenOutline className="w-4 h-4" /> Download
                    </Button>
                </div>

                <div className="flex flex-col gap-[10px]">
                    <div className="flex justify-between items-center">
                        <Label>PVRTexTool CLI path</Label>
                        <div className="flex items-center gap-1">
                            Enabled
                            <Switch checked={this.props.editor.state.compressedTexturesEnabled} onCheckedChange={(v) => this.props.editor.setState({ compressedTexturesEnabled: v })} />
                        </div>
                    </div>

                    <Button variant="outline" className="justify-start w-[460px] whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => this._handleBrowsePVRTexToolCliPath()}>
                        {this.props.editor.state.compressedTexturesCliPath ?? "None"}
                    </Button>
                </div>
            </div>
        );
    }

    private _handleBrowsePVRTexToolCliPath(): void {
        const file = openSingleFileDialog({
            title: "Select PVRTexTool CLI executable",
        });

        if (file) {
            this.props.editor.setState({ compressedTexturesCliPath: file });
        }
    }

    private _getPluginsComponent(): ReactNode {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        return (
            <div className="flex flex-col gap-[10px] w-full">
                <div className="flex justify-between items-center w-full">
                    <div className="text-xl font-[400]">
                        Plugins
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="outline" className="w-10 h-10 rounded-full p-1">
                                <AiOutlinePlus className="w-10 h-10" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Add Plugin</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>From npm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => this._handleAddPluginFromLocalDisk()}>From local disk</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {this.props.editor.state.plugins.map((plugin) => (
                    <EditorEditProjectPluginComponent editor={this.props.editor} pathOrName={plugin} onRemoved={() => this._handlePluginRemoved(plugin)} />
                ))}
            </div>
        );
    }

    private _handleAddPluginFromLocalDisk(): void {
        const directory = openSingleFolderDialog("Select plugin's directory.");

        try {
            require(join(directory, "package.json"));
            const result = require(directory);
            result?.main?.(this.props.editor);

            this.props.editor.setState({
                plugins: [...this.props.editor.state.plugins, directory],
            });
        } catch (e) {
            console.error("Invalid plugin directory.");
        }

        this.forceUpdate();
    }

    private _handlePluginRemoved(pathOrName: string): void {
        const slice = this.props.editor.state.plugins.slice(0);
        const index = slice.indexOf(pathOrName);
        if (index !== -1) {
            slice.splice(index, 1);
        }

        this.props.editor.setState({ plugins: slice });
    }
}
