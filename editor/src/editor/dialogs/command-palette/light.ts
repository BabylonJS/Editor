import { Editor } from "../../main";

import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { lightCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getLightCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{
			...lightCommandItems.pointLight,
			action: () => editor && addPointLight(editor)
		},
		{
			...lightCommandItems.directionalLight,
			action: () => editor && addDirectionalLight(editor)
		},
		{
			...lightCommandItems.spotLight,
			action: () => editor && addSpotLight(editor)
		},
		{
			...lightCommandItems.hemisphericLight,
			action: () => editor && addHemisphericLight(editor)
		},
	];
}
