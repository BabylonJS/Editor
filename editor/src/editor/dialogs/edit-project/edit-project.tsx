import { shell } from "electron";
import { join, dirname } from "path/posix";

import { Component, ReactNode } from "react";

import { AiOutlinePlus } from "react-icons/ai";
import { IoOpenOutline } from "react-icons/io5";

import { execNodePty } from "../../../tools/node-pty";
import { openSingleFileDialog, openSingleFolderDialog } from "../../../tools/dialog";

import { showPrompt } from "../../../ui/dialog";

import { Label } from "../../../ui/shadcn/ui/label";
import { Button } from "../../../ui/shadcn/ui/button";
import { Switch } from "../../../ui/shadcn/ui/switch";
import { Separator } from "../../../ui/shadcn/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../ui/shadcn/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

import { saveProject } from "../../../project/save/save";
import { projectConfiguration } from "../../../project/configuration";
import { getCompressedTexturesCliPath, setCompressedTexturesCliPath } from "../../../project/export/ktx";

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
                        <AlertDialogTitle className="text-3xl font-[400]">
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

                <Label className="text-xl font-[400]">Textures</Label>

                <div className="flex justify-between items-center gap-2">
                    Compress textures using PVRTexTool CLI.

                    <Button variant="ghost" className="flex items-center gap-[5px]" onClick={() => shell.openExternal("https://www.imaginationtech.com/")}>
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

                    <Button variant="outline" className="justify-start w-[460px] text-muted whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => this._handleBrowsePVRTexToolCliPath()}>
                        {getCompressedTexturesCliPath() ?? "None"}
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
            setCompressedTexturesCliPath(file);
        }

        this.forceUpdate();
    }

    private _getPluginsComponent(): ReactNode {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        return (
            <div className="flex flex-col gap-[10px] w-full mt-[10px]">
                <Separator />

                <div className="flex justify-between items-center w-full">
                    <Label className="text-xl font-[400]">Plugins</Label>

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="outline" className="w-10 h-10 rounded-full p-1">
                                <AiOutlinePlus className="w-10 h-10" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Add Plugin</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => this._handleAddPluginFromNpm()}>From npm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => this._handleAddPluginFromLocalDisk()}>From local disk</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {this.props.editor.state.plugins.map((plugin) => (
                    <EditorEditProjectPluginComponent key={plugin} editor={this.props.editor} pathOrName={plugin} onRemoved={() => this._handlePluginRemoved(plugin)} />
                ))}
            </div>
        );
    }

    private async _handleAddPluginFromNpm(): Promise<void> {
        if (!projectConfiguration.path) {
            return;
        }

        const name = await showPrompt("Package name", "Please provide the name of the plugin's package on npm", "");
        if (!name) {
            return;
        }

        const projectDir = dirname(projectConfiguration.path);

        try {
            const p = await execNodePty(`yarn add -D ${name}`, {
                cwd: projectDir,
            });

            p.onGetDataObservable.add((d) => this.props.editor.layout.console.log(d));

            await p.wait();

            const pluginBaseDir = join(projectDir, "node_modules", name);

            require(join(pluginBaseDir, "package.json"));
            const result = require(pluginBaseDir);
            result.main(this.props.editor);

            this.props.editor.setState({
                plugins: [...this.props.editor.state.plugins, name],
            });
        } catch (e) {
            this.props.editor.layout.console.error("Invalid plugin.");
            if (e.message) {
                this.props.editor.layout.console.error(e.message);
            }
        }
    }

    private _handleAddPluginFromLocalDisk(): void {
        const directory = openSingleFolderDialog("Select plugin's directory.");

        try {
            require(join(directory, "package.json"));
            const result = require(directory);
            result.main(this.props.editor);

            this.props.editor.setState({
                plugins: [...this.props.editor.state.plugins, directory],
            });
        } catch (e) {
            this.props.editor.layout.console.error("Invalid plugin.");
            if (e.message) {
                this.props.editor.layout.console.error(e.message);
            }
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
