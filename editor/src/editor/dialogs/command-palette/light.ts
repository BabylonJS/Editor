import { Editor } from "../../main";

import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { ICommandPaletteType } from "./command-palette";

export enum LightKey {
	ADD_POINT_LIGHT = "add-point-light",
	ADD_DIRECTIONAL_LIGHT = "add-directional-light",
	ADD_SPOT_LIGHT = "add-spot-light",
	ADD_HEMISPHERIC_LIGHT = "add-hemispheric-light",
}

export enum LightIPCRendererChannelKey {
	POINT_LIGHT = "point-light",
	DIRECTIONAL_LIGHT = "directional-light",
	SPOT_LIGHT = "spot-light",
	HEMISPHERIC_LIGHT = "hemispheric-light",
}

export function getLightCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Point Light", 
			label: "Add a new point light to the scene", 
			key: LightKey.ADD_POINT_LIGHT, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.POINT_LIGHT, 
			action: () => editor && addPointLight(editor) },
		{ 
			text: "Directional Light", 
			label: "Add a new directional light to the scene", 
			key: LightKey.ADD_DIRECTIONAL_LIGHT, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.DIRECTIONAL_LIGHT, 
			action: () => editor && addDirectionalLight(editor) },
		{ 
			text: "Spot Light", 
			label: "Add a new spot light to the scene", 
			key: LightKey.ADD_SPOT_LIGHT, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.SPOT_LIGHT, 
			action: () => editor && addSpotLight(editor) },
		{ 
			text: "Hemispheric Light", 
			label: "Add a new hemispheric light to the scene", 
			key: LightKey.ADD_HEMISPHERIC_LIGHT, 
			ipcRendererChannelKey: LightIPCRendererChannelKey.HEMISPHERIC_LIGHT, 
			action: () => editor && addHemisphericLight(editor) },
	];
}
