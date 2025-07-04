import { Editor } from "../../main";

import { addPBRMaterial, addStandardMaterial, addNodeMaterial, addSkyMaterial } from "../../../project/add/material";

import { ICommandPaletteType } from "./command-palette";

export enum MaterialKey {
	AddPBRMaterial = "add-pbr-material",
	AddStandardMaterial = "add-standard-material",
	AddNodeMaterial = "add-node-material",
	AddSkyMaterial = "add-sky-material",
}

export enum MaterialIPCRendererChannelKey {
	PBRMaterial = "pbr-material",
	StandardMaterial = "standard-material",
	NodeMaterial = "node-material",
	SkyMaterial = "sky-material",
}

export function getMaterialCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "PBR Material", 
			label: "Add a new PBR material to the scene", 
			key: MaterialKey.AddPBRMaterial, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.PBRMaterial,
			action: () => editor && addPBRMaterial(editor.layout.preview.scene) },
		{ 
			text: "Standard Material", 
			label: "Add a new standard material to the scene", 
			key: MaterialKey.AddStandardMaterial, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.StandardMaterial, 
			action: () => editor && addStandardMaterial(editor.layout.preview.scene) },
		{ 
			text: "Node Material", 
			label: "Add a new node material to the scene", 
			key: MaterialKey.AddNodeMaterial, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.NodeMaterial, 
			action: () => editor && addNodeMaterial(editor.layout.preview.scene) },
		{ 
			text: "Sky Material", 
			label: "Add a new sky material to the scene", 
			key: MaterialKey.AddSkyMaterial, 
			ipcRendererChannelKey: MaterialIPCRendererChannelKey.SkyMaterial, 
			action: () => editor && addSkyMaterial(editor.layout.preview.scene) },
	];
}
