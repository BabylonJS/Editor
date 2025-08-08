import { Editor } from "../../main";

import { addPBRMaterial, addStandardMaterial, addNodeMaterial, addSkyMaterial, addGridMaterial } from "../../../project/add/material";

import { ICommandPaletteType } from "./command-palette";

export function getMaterialCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{
			text: "PBR Material",
			label: "Add a new PBR material to the scene",
			key: "add-pbr-material",
			action: () => editor && addPBRMaterial(editor.layout.preview.scene),
		},
		{
			text: "Standard Material",
			label: "Add a new standard material to the scene",
			key: "add-standard-material",
			action: () => editor && addStandardMaterial(editor.layout.preview.scene),
		},
		{
			text: "Node Material",
			label: "Add a new node material to the scene",
			key: "add-node-material",
			action: () => editor && addNodeMaterial(editor.layout.preview.scene),
		},
		{
			text: "Sky Material",
			label: "Add a new sky material to the scene",
			key: "add-sky-material",
			action: () => editor && addSkyMaterial(editor.layout.preview.scene),
		},
		{
			text: "Grid Material",
			label: "Add a new grid material to the scene",
			key: "add-grid-material",
			action: () => editor && addGridMaterial(editor.layout.preview.scene),
		},
	];
}
