import { Editor } from "../../main";

import { saveProject } from "../../../project/save/save";

import { ICommandPaletteType } from "./command-palette";

export enum ProjectKey {
	SAVE_PROJECT = "save-project",
}

export function getProjectCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Save", 
			label: "Saves the project.", 
			key: ProjectKey.SAVE_PROJECT, 
			action: () => saveProject(editor) 
		},
	];
}
