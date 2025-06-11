import { Editor } from "../../main";

import { addFreeCamera, addArcRotateCamera } from "../../../project/add/camera";

import { ICommandPaletteType } from "./command-palette";

export function getCameraCommands(editor: Editor): ICommandPaletteType[] {
    return [
        { text: "Add Free Camera", label: "Add a new free camera to the scene", action: () => addFreeCamera(editor) },
        { text: "Add Arc Rotate Camera", label: "Add a new arc-rotate camera to the scene", action: () => addArcRotateCamera(editor) },
    ];
}
