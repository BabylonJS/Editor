import { pathExists } from "fs-extra";
import { join, dirname } from "path/posix";

import { useEffect, useState } from "react";
import { SiTypescript } from "react-icons/si";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { projectConfiguration } from "../../../../project/configuration";

import { EditorInspectorSwitchField } from "../fields/switch";

export interface IInspectorScriptFieldProps {
    script: any;
    onRemove: () => void;
}

export function InspectorScriptField(props: IInspectorScriptFieldProps) {
    const [exists, setExists] = useState(true);

    useEffect(() => {
        checkExists();
    }, [props.script]);

    async function checkExists() {
        if (!projectConfiguration.path) {
            return;
        }

        const src = join(dirname(projectConfiguration.path), "src", props.script.key);
        setExists(await pathExists(src));
    }

    return (
        <div className="flex gap-[10px] bg-muted-foreground/35 dark:bg-muted-foreground/5 rounded-lg px-5">
            <SiTypescript size="80px" />

            <div className="flex flex-col w-full py-2.5">
                <div className={`font-bold px-2 hover:underline transition-all duration-300 ease-in-out cursor-pointer ${exists ? "" : "text-red-400"}`}>
                    {props.script.key} {exists ? "" : "(Not found)"}
                </div>

                <EditorInspectorSwitchField object={props.script} property="enabled" label="Enabled" />
            </div>

            <div className="flex justify-center items-center w-10 h-10 p-1 hover:bg-secondary rounded-lg my-auto transition-all duration-300" onClick={() => props.onRemove()}>
                <XMarkIcon className="w-6 h-6" />
            </div>
        </div>
    );
}
