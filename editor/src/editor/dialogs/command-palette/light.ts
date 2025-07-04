import { Editor } from "../../main";

import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { ICommandPaletteType } from "./command-palette";

export enum LightKey {
	AddPointLight = "add-point-light",
	AddDirectionalLight = "add-directional-light",
	AddSpotLight = "add-spot-light",
	AddHemisphericLight = "add-hemispheric-light",
}

export enum LightIPCRendererChannelKey {
	PointLight = "point-light",
	DirectionalLight = "directional-light",
	SpotLight = "spot-light",
	HemisphericLight = "hemispheric-light",
}

export function getLightCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Point Light", 
			label: "Add a new point light to the scene", 
			key: LightKey.AddPointLight, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.PointLight, 
			action: () => editor && addPointLight(editor) },
		{ 
			text: "Directional Light", 
			label: "Add a new directional light to the scene", 
			key: LightKey.AddDirectionalLight, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.DirectionalLight,
			action: () => editor && addDirectionalLight(editor) },
		{ 
			text: "Spot Light", 
			label: "Add a new spot light to the scene", 
			key: LightKey.AddSpotLight, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.SpotLight, 
			action: () => editor && addSpotLight(editor) },
		{ 
			text: "Hemispheric Light", 
			label: "Add a new hemispheric light to the scene", 
			key: LightKey.AddHemisphericLight, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.HemisphericLight, 
			action: () => editor && addHemisphericLight(editor) },
	];
}
