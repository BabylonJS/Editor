import { Node } from "babylonjs";

import { Editor } from "../../main";

import { addFreeCamera, addArcRotateCamera } from "../../../project/add/camera";

import { cameraCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getCameraCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...cameraCommandItems.freeCamera,
			action: () => editor && addFreeCamera(editor, parent),
		},
		{
			...cameraCommandItems.arcRotateCamera,
			action: () => editor && addArcRotateCamera(editor, parent),
		},
	];
}
