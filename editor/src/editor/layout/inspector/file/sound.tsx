import { basename } from "path/posix";

import { Divider } from "@blueprintjs/core";
import { BiSolidSpeaker } from "react-icons/bi";

import { FileInspectorObject } from "../file";

export interface IEditorInspectorSoundComponentProps {
    object: FileInspectorObject;
}

export function EditorInspectorSoundComponent(props: IEditorInspectorSoundComponentProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 justify-center items-center text-xl font-bold">
                <BiSolidSpeaker size="24px" />
                {basename(props.object.absolutePath)}
            </div>

            <Divider />

            <audio controls className="w-full px-5">
                <source src={props.object.absolutePath} />
            </audio>
        </div>
    );
}
