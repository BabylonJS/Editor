import { Editor } from "../../main";

import { saveProject } from "../../../project/save/save";

import { ICommandPaletteType } from "./command-palette";

export enum ProjectKey {
	SaveProject = "save-project",
}

export function getProjectCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Save", 
			label: "Saves the project.", 
			key: ProjectKey.SaveProject, 
			action: () => saveProject(editor) 
		},
	];
}
