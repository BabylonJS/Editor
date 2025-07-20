import { Node } from "babylonjs";

import { Editor } from "../../main";

import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { lightCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getLightCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...lightCommandItems.pointLight,
			action: () => editor && addPointLight(editor, parent),
		},
		{
			...lightCommandItems.directionalLight,
			action: () => editor && addDirectionalLight(editor, parent),
		},
		{
			...lightCommandItems.spotLight,
			action: () => editor && addSpotLight(editor, parent),
		},
		{
			...lightCommandItems.hemisphericLight,
			action: () => editor && addHemisphericLight(editor, parent),
		},
	];
}
