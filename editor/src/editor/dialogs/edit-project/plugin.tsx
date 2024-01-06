import { useEffect, useState } from "react";

import { RxCross1 } from "react-icons/rx";
import { IoReload } from "react-icons/io5";

import { Button } from "../../../ui/shadcn/ui/button";

import { showConfirm } from "../../../ui/dialog";

export interface IEditorEditProjectPluginComponentProps {
    pathOrName: string;
    onRemoved: () => void;
}

export function EditorEditProjectPluginComponent(props: IEditorEditProjectPluginComponentProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        const result = require(props.pathOrName);
        setTitle(result.title ?? "Unnamed Plugin");
        setDescription(result.description ?? "No description provided.");
    }, []);

    async function handleRemove() {
        const remove = await showConfirm("Remove plugin", "Are you sure you want to remove this plugin?");
        if (!remove) {
            return;
        }

        try {
            const result = require(props.pathOrName);
            result.close?.();
        } catch (e) {
            console.error("Failed to remove plugin", e);
        } finally {
            props.onRemoved();
        }
    }

    return (
        <div className="flex justify-between items-center w-full p-5 bg-secondary rounded-lg">
            <div className="flex flex-col">
                <div className="text-xl font-[400]">
                    {title}
                </div>
                <div className="font-[400]">
                    {description}
                </div>
                <div className="text-xs font-[400]">
                    {props.pathOrName}
                </div>
            </div>

            <div className="flex flex-col">
                <Button variant="outline" className="w-10 h-10 rounded-full p-2">
                    <IoReload className="w-10 h-10" />
                </Button>
                <Button variant="outline" className="w-10 h-10 rounded-full p-2" onClick={() => handleRemove()}>
                    <RxCross1 className="w-10 h-10" />
                </Button>
            </div>
        </div>
    );
}
