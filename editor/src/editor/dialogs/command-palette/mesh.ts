import { Editor } from "../../main";

import {
	addTransformNode, addBoxMesh, addGroundMesh, addSphereMesh, addPlaneMesh, addSkyboxMesh,
	addEmptyMesh,
} from "../../../project/add/mesh";

import { ICommandPaletteType } from "./command-palette";

export enum MeshKey {
	AddTransformNode = "add-transform-node",
	AddBoxMesh = "add-box-mesh",
	AddPlaneMesh = "add-plane-mesh",
	AddGroundMesh = "add-ground-mesh",
	AddSphereMesh = "add-sphere-mesh",
	AddSkyboxMesh = "add-skybox-mesh",
	AddEmptyMesh = "add-empty-mesh",
}

export enum MeshIPCRendererChannelKey {
	TransformNode = "transform-node",
	BoxMesh = "box-mesh",
	PlaneMesh = "plane-mesh",
	GroundMesh = "ground-mesh",
	SphereMesh = "sphere-mesh",
	SkyboxMesh = "skybox-mesh",
	EmptyMesh = "empty-mesh",
}

export function getMeshCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Transform Node", 
			label: "Add a new transform node to the scene", 
			key: MeshKey.AddTransformNode, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.TransformNode, 
			action: () => editor && addTransformNode(editor) },
		{ 
			text: "Box Mesh", 
			label: "Add a new box mesh to the scene", 
			key: MeshKey.AddBoxMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.BoxMesh,
			action: () => editor && addBoxMesh(editor) },
		{ 
			text: "Plane Mesh", 
			label: "Add a new plane mesh to the scene", 
			key: MeshKey.AddPlaneMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.PlaneMesh, 
			action: () => editor && addPlaneMesh(editor) },
		{ 
			text: "Ground Mesh", 
			label: "Add a new ground mesh to the scene", 
			key: MeshKey.AddGroundMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.GroundMesh, 
			action: () => editor && addGroundMesh(editor) },
		{ 
			text: "Sphere Mesh", 
			label: "Add a new sphere mesh to the scene", 
			key: MeshKey.AddSphereMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.SphereMesh, 
			action: () => editor && addSphereMesh(editor) },
		{ 
			text: "Skybox Mesh", 
			label: "Add a new skybox mesh to the scene", 
			key: MeshKey.AddSkyboxMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.SkyboxMesh, 
			action: () => editor && addSkyboxMesh(editor) },
		{ 
			text: "Empty Mesh", 
			label: "Add a new empty mesh to the scene", 
			key: MeshKey.AddEmptyMesh, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.EmptyMesh, 
			action: () => editor && addEmptyMesh(editor) },
	];
}




