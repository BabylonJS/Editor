import { join, dirname } from "path/posix";

import { Grid } from "react-loader-spinner";
import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { showPrompt } from "../../../../ui/dialog";

import { Label } from "../../../../ui/shadcn/ui/label";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Separator } from "../../../../ui/shadcn/ui/separator";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../../ui/shadcn/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";

import { execNodePty } from "../../../../tools/node-pty";
import { openSingleFolderDialog } from "../../../../tools/dialog";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

import { EditorEditProjectPluginItemComponent } from "./item";

export interface IEditorEditProjectPluginComponentProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
}

export interface IEditorEditProjectPluginComponentState {
    installing: boolean;
}

export class EditorEditProjectPluginComponent extends Component<IEditorEditProjectPluginComponentProps, IEditorEditProjectPluginComponentState> {
    public constructor(props: IEditorEditProjectPluginComponentProps) {
        super(props);

        this.state = {
            installing: false,
        };
    }

    public render(): ReactNode {
        if (!this.props.editor.state.projectPath) {
            return;
        }

        return (
            <>
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
                        <EditorEditProjectPluginItemComponent key={plugin} editor={this.props.editor} pathOrName={plugin} onRemoved={() => this._handlePluginRemoved(plugin)} />
                    ))}
                </div>

                <AlertDialog open={this.state.installing}>
                    <AlertDialogContent className="w-fit h-fit">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Installing</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="flex justify-center items-center w-full h-full">
                                    <Grid width={24} height={24} color="gray" />
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>

                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
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

        this.setState({ installing: true });

        try {
            let command = "";
            switch (this.props.editor.state.packageManager) {
                case "npm": command = `npm i ${name} --save-dev`; break;
                case "pnpm": command = `pnpm add -D ${name}`; break;
                case "bun": command = `bun add -d ${name}`; break;
                default: command = `yarn add -D ${name}`; break;
            }

            const p = await execNodePty(command, {
                cwd: projectDir,
            });

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

        this.setState({ installing: false });
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
