import { join } from "path/posix";
import { ipcRenderer } from "electron";
import { readJSON, remove, writeJSON } from "fs-extra";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { useState } from "react";

import { Grid } from "react-loader-spinner";

import { showAlert, showConfirm } from "../ui/dialog";

import { Input } from "../ui/shadcn/ui/input";
import { Button } from "../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/shadcn/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { openSingleFolderDialog } from "../tools/dialog";
import { tryAddProjectToLocalStorage } from "../tools/local-storage";

import { EditorProjectPackageManager, IEditorProject } from "../project/typings";

export interface IDashboardCreateProjectDialogProps {
    isOpened: boolean;
    onClose: () => void;
}

export function DashboardCreateProjectDialog(props: IDashboardCreateProjectDialogProps) {
    const [destination, setDestination] = useState("");
    const [packageManager, setPackageManager] = useState<EditorProjectPackageManager>("yarn");

    const [creating, setCreating] = useState(false);

    async function handleBrowseFolderPath() {
        const folder = openSingleFolderDialog("Select folder to create the project in");

        if (folder) {
            setDestination(folder);
        }
    }

    async function handleCreateProject() {
        setCreating(true);

        try {
            const templatePath = process.env.DEBUG
                ? "templates/template.tgz"
                : "../../templates/template.tgz";

            const templateBlob = await fetch(templatePath).then(r => r.blob());
            const buffer = Buffer.from(await templateBlob.arrayBuffer());

            await decompress(buffer, destination, {
                plugins: [
                    decompressTargz(),
                ],
                map: (file) => {
                    file.path = file.path.replace("package/", "");
                    return file;
                }
            });

            await remove(join(destination, "package"));

            const projectAbsolutePath = join(destination, "project.bjseditor");

            const projectContent = await readJSON(projectAbsolutePath) as IEditorProject;
            projectContent.packageManager = packageManager;

            await writeJSON(projectAbsolutePath, projectContent, {
                spaces: "\t",
                encoding: "utf-8",
            });

            tryAddProjectToLocalStorage(projectAbsolutePath);

            props.onClose();

            const result = await showConfirm("Open project?", "Do you want to open the newly created project?", {
                cancelText: "No",
                confirmText: "Yes",
            });

            if (result) {
                ipcRenderer.send("dashboard:open-project", projectAbsolutePath);
            }
        } catch (e) {
            showAlert("An unexpected error occured", e.message);
        }

        setCreating(false);
        setDestination("");
    }

    return (
        <Dialog open={props.isOpened} onOpenChange={(o) => !o && props.onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Create project
                    </DialogTitle>
                    <DialogDescription className="flex flex-col gap-4 py-5">
                        {!creating &&
                            <>
                                <div className="flex flex-col gap-2">
                                    <div>
                                        Select the folder where to create the project.
                                    </div>

                                    <div className="flex gap-[10px]">
                                        <Input value={destination} disabled placeholder="Folder path..." />
                                        <Button variant="secondary" className="w-24" onClick={() => handleBrowseFolderPath()}>
                                            Browse...
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div>
                                        Package manager
                                    </div>

                                    <Select
                                        value={packageManager}
                                        onValueChange={(v) => setPackageManager(v as EditorProjectPackageManager)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Package manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="npm">npm</SelectItem>
                                            <SelectItem value="yarn">yarn</SelectItem>
                                            <SelectItem value="pnpm">pnpm</SelectItem>
                                            <SelectItem value="bun">bun</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        }

                        {creating &&
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
                        className="w-24"
                        onClick={() => handleCreateProject()}
                        disabled={destination === "" || creating}
                    >
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
