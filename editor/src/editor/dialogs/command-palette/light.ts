import { Editor } from "../../main";

import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { ICommandPaletteType } from "./command-palette";

export function getLightCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{ text: "Add Point Light", label: "Add a new point light to the scene", action: () => addPointLight(editor) },
		{ text: "Add Directional Light", label: "Add a new directional light to the scene", action: () => addDirectionalLight(editor) },
		{ text: "Add Spot Light", label: "Add a new spot light to the scene", action: () => addSpotLight(editor) },
		{ text: "Add Hemispheric Light", label: "Add a new hemispheric light to the scene", action: () => addHemisphericLight(editor) },
	];
}
