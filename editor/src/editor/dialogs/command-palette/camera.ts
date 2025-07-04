import { Editor } from "../../main";

import { addFreeCamera, addArcRotateCamera } from "../../../project/add/camera";

import { ICommandPaletteType } from "./command-palette";

export enum CameraKey {
	AddFreeCamera = "add-free-camera",
	AddArcRotateCamera = "add-arc-rotate-camera",
}

export enum CameraIPCRendererChannelKey {
	FreeCamera = "free-camera",
	ArcRotateCamera = "arc-rotate-camera",
}

export function getCameraCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Free Camera", 
			label: "Add a new free camera to the scene", 
			key: CameraKey.AddFreeCamera, 
			ipcRendererChannelKey: CameraIPCRendererChannelKey.FreeCamera, 
			action: () => editor && addFreeCamera(editor) },
		{ 
			text: "Arc Rotate Camera", 
			label: "Add a new arc-rotate camera to the scene", 
			key: CameraKey.AddArcRotateCamera, 
			ipcRendererChannelKey: CameraIPCRendererChannelKey.ArcRotateCamera, 
			action: () => editor && addArcRotateCamera(editor) },
	];
}


