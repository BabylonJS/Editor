import { join } from "path/posix";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { openSingleFileDialog, openSingleFolderDialog } from "../../../tools/dialog";

import { Input } from "../../../ui/shadcn/ui/input";
import { Button } from "../../../ui/shadcn/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { Editor } from "../../main";

export interface IEditorWelcomeDialogProps {
    open: boolean;
    editor: Editor;
}

export interface IEditorWelcomeDialogState {
    createProject: boolean;
    creatingProject: boolean;
    createProjectPath: string;
}

export class EditorWelcomeDialog extends Component<IEditorWelcomeDialogProps, IEditorWelcomeDialogState> {
    public constructor(props: IEditorWelcomeDialogProps) {
        super(props);

        this.state = {
            createProject: false,
            createProjectPath: "",
            creatingProject: false,
        };
    }

    public render(): ReactNode {
        return (
            <>
                {!this.state.createProject &&
                    this._getWelcomeComponent()
                }

                {this.state.createProject &&
                    this._getCreateProjectComponent()
                }
            </>
        );
    }

    private _getWelcomeComponent(): ReactNode {
        return (
            <AlertDialog open={this.props.open}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Welcome
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-[10px]">
                            <div>
                                Welcome to the Babylon.JS Editor. This is a work in progress and is not yet ready for production use.
                            </div>

                            <div>
                                You can select a project to load or create a new one.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="secondary" onClick={() => this._handleLoadProject()}>
                            Load Project...
                        </Button>
                        <Button variant="default" onClick={() => this.setState({ createProject: true })}>
                            Create Project...
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    private _handleLoadProject(): void {
        const file = openSingleFileDialog({
            title: "Open Project",
            filters: [
                { name: "BabylonJS Editor Project File", extensions: ["bjseditor"] }
            ],
        });

        if (!file) {
            return;
        }

        this.props.editor.openProject(file);
    }

    private _getCreateProjectComponent(): ReactNode {
        return (
            <AlertDialog open={this.props.open}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Create project
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-[10px]">
                            {!this.state.creatingProject &&
                                <>
                                    <div>
                                        Select the folder where to create the project.
                                    </div>

                                    <div className="flex gap-[10px]">
                                        <Input value={this.state.createProjectPath} disabled placeholder="Folder path..." />
                                        <Button variant="secondary" onClick={() => this._handleBrowseCreateProjectFolderPath()}>
                                            Browse...
                                        </Button>
                                    </div>
                                </>
                            }

                            {this.state.creatingProject &&
                                <div className="flex flex-col gap-[10px] justify-center items-center pt-5">
                                    <Grid width={24} height={24} color="#ffffff" />

                                    <div>
                                        Creating project...
                                    </div>
                                </div>
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button
                            variant="default"
                            onClick={() => this._handleCreateProject()}
                            disabled={this.state.createProjectPath === "" || this.state.creatingProject}
                        >
                            Create
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    private _handleBrowseCreateProjectFolderPath(): void {
        const folder = openSingleFolderDialog("Select folder to create the project in");

        if (folder) {
            this.setState({ createProjectPath: folder });
        }
    }

    private async _handleCreateProject(): Promise<void> {
        this.setState({ creatingProject: true });

        const templatePath = process.env.DEBUG
            ? "templates/template.tgz"
            : "../../templates/template.tgz";

        const templateBlob = await fetch(templatePath).then(r => r.blob());
        const buffer = Buffer.from(await templateBlob.arrayBuffer());

        await decompress(buffer, this.state.createProjectPath, {
            plugins: [
                decompressTargz(),
            ],
            map: (file) => {
                file.path = file.path.replace("package/", "");
                return file;
            }
        });

        this.props.editor.openProject(join(this.state.createProjectPath, "project.bjseditor"));
    }
}
