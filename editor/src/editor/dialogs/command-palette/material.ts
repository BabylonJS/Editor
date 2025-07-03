import { Editor } from "../../main";

import { addPBRMaterial, addStandardMaterial, addNodeMaterial, addSkyMaterial } from "../../../project/add/material";

import { ICommandPaletteType } from "./command-palette";

export enum MaterialKey {
	ADD_PBR_MATERIAL = "add-pbr-material",
	ADD_STANDARD_MATERIAL = "add-standard-material",
	ADD_NODE_MATERIAL = "add-node-material",
	ADD_SKY_MATERIAL = "add-sky-material",
}

export enum MaterialIPCRendererChannelKey {
	PBR_MATERIAL = "pbr-material",
	STANDARD_MATERIAL = "standard-material",
	NODE_MATERIAL = "node-material",
	SKY_MATERIAL = "sky-material",
}

export function getMaterialCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "PBR Material", 
			label: "Add a new PBR material to the scene", 
			key: MaterialKey.ADD_PBR_MATERIAL, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.PBR_MATERIAL, 
			action: () => editor && addPBRMaterial(editor.layout.preview.scene) },
		{ 
			text: "Standard Material", 
			label: "Add a new standard material to the scene", 
			key: MaterialKey.ADD_STANDARD_MATERIAL, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.STANDARD_MATERIAL, 
			action: () => editor && addStandardMaterial(editor.layout.preview.scene) },
		{ 
			text: "Node Material", 
			label: "Add a new node material to the scene", 
			key: MaterialKey.ADD_NODE_MATERIAL, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.NODE_MATERIAL, 
			action: () => editor && addNodeMaterial(editor.layout.preview.scene) },
		{ 
			text: "Sky Material", 
			label: "Add a new sky material to the scene", 
			key: MaterialKey.ADD_SKY_MATERIAL, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.SKY_MATERIAL, 
			action: () => editor && addSkyMaterial(editor.layout.preview.scene) },
	];
}
