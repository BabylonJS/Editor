import { Editor } from "../../editor/main";

import { addDirectionalLight, addPointLight } from "../../project/add/light";

import { ICommandPaletteType } from "./command-palette";

export function getLightCommands(editor: Editor): ICommandPaletteType[] {
    return [
        { text: "Add Point Light", label: "Add a new point light to the scene", action: () => addPointLight(editor) },
        { text: "Add Directional Light", label: "Add a new directional light to the scene", action: () => addDirectionalLight(editor) },
    ];
}
