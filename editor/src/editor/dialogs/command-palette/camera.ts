import { Editor } from "../../main";

import { addFreeCamera, addArcRotateCamera } from "../../../project/add/camera";

import { ICommandPaletteType } from "./command-palette";

export enum CameraKey {
	ADD_FREE_CAMERA = "add-free-camera",
	ADD_ARC_ROTATE_CAMERA = "add-arc-rotate-camera",
}

export enum CameraIPCRendererChannelKey {
	FREE_CAMERA = "free-camera",
	ARC_ROTATE_CAMERA = "arc-rotate-camera",
}

export function getCameraCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Free Camera", 
			label: "Add a new free camera to the scene", 
			key: CameraKey.ADD_FREE_CAMERA, 
			ipcRendererChannelKey: CameraIPCRendererChannelKey.FREE_CAMERA, 
			action: () => editor && addFreeCamera(editor) },
		{ 
			text: "Arc Rotate Camera", 
			label: "Add a new arc-rotate camera to the scene", 
			key: CameraKey.ADD_ARC_ROTATE_CAMERA, 
			ipcRendererChannelKey: CameraIPCRendererChannelKey.ARC_ROTATE_CAMERA, 
			action: () => editor && addArcRotateCamera(editor) },
	];
}

