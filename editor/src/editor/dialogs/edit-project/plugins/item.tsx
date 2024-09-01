import { pathExists } from "fs-extra";
import { basename, dirname, join } from "path/posix";

import { Grid } from "react-loader-spinner";
import { useEffect, useState } from "react";

import { RxCross1 } from "react-icons/rx";
import { IoReload, IoCloseOutline } from "react-icons/io5";

import { execNodePty } from "../../../../tools/node-pty";

import { projectConfiguration } from "../../../../project/configuration";

import { Button } from "../../../../ui/shadcn/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../../ui/shadcn/ui/alert-dialog";

import { showConfirm } from "../../../../ui/dialog";

import { Editor } from "../../../main";

export interface IEditorEditProjectPluginComponentProps {
    editor: Editor;
    pathOrName: string;
    onRemoved: () => void;
}

export function EditorEditProjectPluginItemComponent(props: IEditorEditProjectPluginComponentProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [version, setVersion] = useState("");

    const [onError, setOnError] = useState(false);

    const [isFromNpm, setIsFromNpm] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    useEffect(() => {
        requireAndSetupPlugin();
        pathExists(props.pathOrName).then((exists) => setIsFromNpm(!exists));
    }, []);

    async function requireAndSetupPlugin() {
        const requireId = await getRequireId();
        if (!requireId) {
            return;
        }

        try {
            const result = require(requireId);
            setTitle(result.title ?? "Unnamed Plugin");
            setDescription(result.description ?? "No description provided.");

            const packageJson = require(join(requireId, "package.json"));
            setVersion(`v${packageJson.version}`);
        } catch (e) {
            setOnError(true);
        }
    }

    async function handleRemove() {
        const requireId = await getRequireId();
        if (!requireId) {
            return;
        }

        const remove = await showConfirm("Remove plugin", "Are you sure you want to remove this plugin?");
        if (!remove) {
            return;
        }

        try {
            const result = require(requireId);
            result.close?.();
        } catch (e) {
            console.error("Failed to remove plugin", e);
            props.editor.layout.console.error(`Failed to remove plugin: ${e.message}`);
        } finally {
            props.onRemoved();
        }
    }

    async function handleUpdate() {
        if (!projectConfiguration.path) {
            return;
        }

        const projectDir = dirname(projectConfiguration.path);

        setUpgrading(true);

        const requireId = await getRequireId();
        if (!requireId) {
            return;
        }

        try {
            const result = require(requireId);
            result.close?.();
        } catch (e) {
            props.editor.layout.console.error("Invalid plugin. Failed to close plugin before upgrading.");
            if (e.message) {
                props.editor.layout.console.error(e.message);
            }
        }

        try {
            const p = await execNodePty(`yarn upgrade ${props.pathOrName}`, {
                cwd: projectDir,
            });

            await p.wait();

            const result = require(requireId);
            result.main(props.editor);
        } catch (e) {
            props.editor.layout.console.error("Invalid plugin.");
            if (e.message) {
                props.editor.layout.console.error(e.message);
            }
        }

        setUpgrading(false);
    }

    async function getRequireId() {
        if (!projectConfiguration.path) {
            return null;
        }

        const isLocalPlugin = await pathExists(props.pathOrName);

        let requireId = props.pathOrName;
        if (!isLocalPlugin) {
            const projectDir = dirname(projectConfiguration.path);
            requireId = join(projectDir, "node_modules", props.pathOrName);
        }

        return requireId;
    }

    return (
        <>
            <div className="flex justify-between items-center w-full p-5 bg-secondary rounded-lg">
                {!onError &&
                    <div className="flex flex-col">
                        <div className="text-xl font-[400]">
                            {title}
                        </div>
                        <div className="font-[400]">
                            {description}
                        </div>
                        <div className="text-xs font-[400]">
                            {props.pathOrName} {version}
                        </div>
                    </div>
                }

                {onError &&
                    <div className="flex items-center gap-2">
                        <div className="flex justify-center items-center w-10 h-10 rounded-full p-2 bg-destructive">
                            <IoCloseOutline size={32} />
                        </div>

                        <div className="flex flex-col">
                            <div>
                                Failed to load ...{basename(props.pathOrName)}
                            </div>
                            <div className="text-xs">
                                {props.pathOrName}
                            </div>
                        </div>
                    </div>
                }

                <div className="flex flex-col">
                    {isFromNpm &&
                        <Button variant="outline" className="w-10 h-10 rounded-full p-2" onClick={() => handleUpdate()}>
                            <IoReload className="w-10 h-10" />
                        </Button>
                    }

                    <Button variant="outline" className="w-10 h-10 rounded-full p-2" onClick={() => handleRemove()}>
                        <RxCross1 className="w-10 h-10" />
                    </Button>
                </div>
            </div>

            <AlertDialog open={upgrading}>
                <AlertDialogContent className="w-fit h-fit">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Upgrading...</AlertDialogTitle>
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
