import { Editor } from "../../main";

import { addTransformNode, addBox, addGroundMesh, addSphereMesh } from "../../../project/add/mesh";

import { ICommandPaletteType } from "./command-palette";

export function getMeshCommands(editor: Editor): ICommandPaletteType[] {
    return [
        { text: "Add Transform Node", label: "Add a new transform node to the scene", action: () => addTransformNode(editor) },
        { text: "Add Box Mesh", label: "Add a new box mesh to the scene", action: () => addBox(editor) },
        { text: "Add Ground Mesh", label: "Add a new ground mesh to the scene", action: () => addGroundMesh(editor) },
        { text: "Add Sphere Mesh", label: "Add a new sphere mesh to the scene", action: () => addSphereMesh(editor) },
    ];
}
