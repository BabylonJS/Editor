import { platform } from "os";
import { join } from "path/posix";
import { pathExists } from "fs-extra";
import { ipcRenderer } from "electron";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Fade } from "react-awesome-reveal";
import { Grid } from "react-loader-spinner";

import { Input } from "../ui/shadcn/ui/input";
import { Button } from "../ui/shadcn/ui/button";
import { Separator } from "../ui/shadcn/ui/separator";
import { showConfirm, showAlert } from "../ui/dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { ProjectType, projectsKey } from "../tools/project";
import { tryGetProjectsFromLocalStorage } from "../tools/local-storage";
import { openSingleFileDialog, openSingleFolderDialog } from "../tools/dialog";

import { ProjectTile } from "./tile";
import { WindowControls } from "./window-controls";

export function createDashboard(): void {
    const theme = localStorage.getItem("editor-theme") ?? "dark";
    if (theme === "dark") {
        document.body.classList.add("dark");
    }

    const div = document.getElementById("babylonjs-editor-main-div")!;

    const root = createRoot(div);
    root.render(
        <div className="w-screen h-screen">
            <Dashboard />
        </div>
    );
}

export interface IDashboardProps {

}

export interface IDashboardState {
    projects: ProjectType[];
    openedProjects: string[];

    createProject: boolean;
    creatingProject: boolean;
    createProjectPath: string;
}

export class Dashboard extends Component<IDashboardProps, IDashboardState> {
    public constructor(props: IDashboardProps) {
        super(props);

        this.state = {
            openedProjects: [],
            projects: tryGetProjectsFromLocalStorage(),

            createProject: false,
            createProjectPath: "",
            creatingProject: false,
        };
    }

    public render(): ReactNode {
        return (
            <>
                <div className={`flex flex-col gap-4 w-screen h-screen p-5 select-none overflow-x-hidden ${platform() === "darwin" ? "pt-8" : "pt-10"}`}>
                    <WindowControls />

                    <Fade delay={0}>
                        <div className="flex justify-between items-center w-full">
                            <div className="text-5xl font-semibold">
                                Dashboard
                            </div>

                            <div className="flex items-center gap-2">
                                <img alt="" src="assets/babylonjs_icon.png" className="w-[48px] object-contain" />
                            </div>
                        </div>
                    </Fade>

                    <Fade delay={250}>
                        <Separator />
                    </Fade>

                    <Fade delay={500}>
                        <div className="flex justify-between items-center">
                            <div className="text-3xl font-semibold">
                                Projects
                            </div>

                            <div className="flex gap-2">
                                <Button variant="secondary" className="font-semibold" onClick={() => this._handleImportProject()}>
                                    Import project
                                </Button>
                                <Button className="font-semibold" onClick={() => this.setState({ createProject: true })}>
                                    Create project
                                </Button>
                            </div>
                        </div>
                    </Fade>

                    <Fade delay={750}>
                        {!this.state.projects.length && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                No project found.
                            </div>
                        )}

                        {this.state.projects.length &&
                            <div className="grid sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {this.state.projects.map((project) => (
                                    <ProjectTile
                                        project={project}
                                        key={project.absolutePath}
                                        isOpened={this.state.openedProjects.includes(project.absolutePath)}
                                        onRemove={() => this._tryRemoveProjectFromLocalStorage(project)}
                                    />
                                ))}
                            </div>
                        }
                    </Fade>
                </div>

                {this._getCreateProjectComponent()}
            </>
        );
    }

    public async componentDidMount(): Promise<void> {
        ipcRenderer.send("dashboard:ready");

        ipcRenderer.on("dashboard:import-project", () => this._handleImportProject());
        ipcRenderer.on("dashboard:new-project", () => this.setState({ createProject: true }));

        ipcRenderer.on("dashboard:opened-projects", (_, openedProjects) => this.setState({ openedProjects }));
        ipcRenderer.on("dashboard:update-projects", () => this.setState({ projects: tryGetProjectsFromLocalStorage() }));

        await Promise.all(this.state.projects.map(async (project) => {
            const exists = await pathExists(project.absolutePath);
            if (!exists) {
                const index = this.state.projects.indexOf(project);
                if (index !== -1) {
                    this.state.projects.splice(index, 1);
                    this.setState({ projects: this.state.projects.slice() });
                }
            }
        }));
    }

    private _getCreateProjectComponent(): ReactNode {
        return (
            <Dialog open={this.state.createProject} onOpenChange={(o) => !o && this.setState({ createProject: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Create project
                        </DialogTitle>
                        <DialogDescription className="flex flex-col gap-[10px]">
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
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="default"
                            onClick={() => this._handleCreateProject()}
                            disabled={this.state.createProjectPath === "" || this.state.creatingProject}
                        >
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    private _handleImportProject(): unknown {
        const file = openSingleFileDialog({
            title: "Open Project",
            filters: [
                { name: "BabylonJS Editor Project File", extensions: ["bjseditor"] }
            ],
        });

        if (!file) {
            return;
        }

        const exists = this.state.projects.find((p) => p.absolutePath === file);
        if (exists) {
            return showAlert("Project already exists", "The project you are trying to import already exists in the dashboard.");
        }

        this._tryAddProjectToLocalStorage(file);
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

        const file = join(this.state.createProjectPath, "project.bjseditor");

        this._tryAddProjectToLocalStorage(file);
        this.setState({ createProject: false });
    }

    private _tryAddProjectToLocalStorage(absolutePath: string) {
        try {
            localStorage.setItem(projectsKey, JSON.stringify(this.state.projects.concat([{
                absolutePath,
                createdAt: new Date(),
                updatedAt: new Date(),
            }])));

            this.setState({ projects: tryGetProjectsFromLocalStorage() });
        } catch (e) {
            alert("Failed to import project.");
        }
    }

    private async _tryRemoveProjectFromLocalStorage(project: ProjectType): Promise<void> {
        const confirm = await showConfirm("Remove project", "Are you sure you want to remove this project?");
        if (!confirm) {
            return;
        }

        const index = this.state.projects.indexOf(project);
        if (index !== -1) {
            this.state.projects.splice(index, 1);

            localStorage.setItem(projectsKey, JSON.stringify(this.state.projects));

            this.setState({ projects: tryGetProjectsFromLocalStorage() });
        }
    }
}
