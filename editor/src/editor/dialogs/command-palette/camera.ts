import { Editor } from "../../main";

import { addFreeCamera, addArcRotateCamera } from "../../../project/add/camera";

import { cameraCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getCameraCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{
			...cameraCommandItems.freeCamera,
			action: () => editor && addFreeCamera(editor),
		},
		{
			...cameraCommandItems.arcRotateCamera,
			action: () => editor && addArcRotateCamera(editor),
		},
	];
}
