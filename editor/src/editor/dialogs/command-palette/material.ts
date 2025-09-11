import { Editor } from "../../main";

import {
	addPBRMaterial,
	addStandardMaterial,
	addNodeMaterial,
	addSkyMaterial,
	addGridMaterial,
	addNormalMaterial,
	addWaterMaterial,
	addLavaMaterial,
	addTriPlanarMaterial,
	addCellMaterial,
	addFireMaterial,
} from "../../../project/add/material";

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
	];
}

export function getMaterialsLibraryCommands(editor?: Editor): ICommandPaletteType[] {
	return [
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
		{
			text: "Normal Material",
			label: "Add a new normal material to the scene",
			key: "add-normal-material",
			action: () => editor && addNormalMaterial(editor.layout.preview.scene),
		},
		{
			text: "Water Material",
			label: "Add a new water material to the scene",
			key: "add-water-material",
			action: () => editor && addWaterMaterial(editor.layout.preview.scene),
		},
		{
			text: "Lava Material",
			label: "Add a new lava material to the scene",
			key: "add-lava-material",
			action: () => editor && addLavaMaterial(editor.layout.preview.scene),
		},
		{
			text: "Tri-Planar Material",
			label: "Add a new Tri-Planar material to the scene",
			key: "add-tri-planar-material",
			action: () => editor && addTriPlanarMaterial(editor.layout.preview.scene),
		},
		{
			text: "Cell Material",
			label: "Add a new Cell material to the scene",
			key: "add-cell-material",
			action: () => editor && addCellMaterial(editor.layout.preview.scene),
		},
		{
			text: "Fire Material",
			label: "Add a new Fire material to the scene",
			key: "add-fire-material",
			action: () => editor && addFireMaterial(editor.layout.preview.scene),
		},
	];
}
