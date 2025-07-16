import { Editor } from "../../main";

import { saveProject } from "../../../project/save/save";

import { ICommandPaletteType } from "./command-palette";

export function getProjectCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{
			text: "Save",
			label: "Saves the project.",
			key: "save-project",
			action: () => saveProject(editor)
		},
	];
}
