import { join } from "path/posix";
import { ipcRenderer } from "electron";

import decompress from "decompress";
import decompressTargz from "decompress-targz";

import { useState } from "react";

import { Grid } from "react-loader-spinner";

import { showAlert, showConfirm } from "../ui/dialog";

import { Input } from "../ui/shadcn/ui/input";
import { Button } from "../ui/shadcn/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/shadcn/ui/dialog";

import { openSingleFolderDialog } from "../tools/dialog";
import { tryAddProjectToLocalStorage } from "../tools/local-storage";

export interface IDashboardCreateProjectDialogProps {
    isOpened: boolean;
    onClose: () => void;
}

export function DashboardCreateProjectDialog(props: IDashboardCreateProjectDialogProps) {
    const [destination, setDestination] = useState("");
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

            const projectAbsolutePath = join(destination, "project.bjseditor");
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
                    <DialogDescription className="flex flex-col gap-[10px]">
                        {!creating &&
                            <>
                                <div>
                                    Select the folder where to create the project.
                                </div>

                                <div className="flex gap-[10px]">
                                    <Input value={destination} disabled placeholder="Folder path..." />
                                    <Button variant="secondary" className="w-24" onClick={() => handleBrowseFolderPath()}>
                                        Browse...
                                    </Button>
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
