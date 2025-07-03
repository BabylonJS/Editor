import { Editor } from "../../main";

import {
	addTransformNode, addBoxMesh, addGroundMesh, addSphereMesh, addPlaneMesh, addSkyboxMesh,
	addEmptyMesh,
} from "../../../project/add/mesh";

import { ICommandPaletteType } from "./command-palette";

export enum MeshKey {
	ADD_TRANSFORM_NODE = "add-transform-node",
	ADD_BOX_MESH = "add-box-mesh",
	ADD_PLANE_MESH = "add-plane-mesh",
	ADD_GROUND_MESH = "add-ground-mesh",
	ADD_SPHERE_MESH = "add-sphere-mesh",
	ADD_SKYBOX_MESH = "add-skybox-mesh",
	ADD_EMPTY_MESH = "add-empty-mesh",
}

export enum MeshIPCRendererChannelKey {
	TRANSFORM_NODE = "transform-node",
	BOX_MESH = "box-mesh",
	PLANE_MESH = "plane-mesh",
	GROUND_MESH = "ground-mesh",
	SPHERE_MESH = "sphere-mesh",
	SKYBOX_MESH = "skybox-mesh",
	EMPTY_MESH = "empty-mesh",
}

export function getMeshCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{ 
			text: "Transform Node", 
			label: "Add a new transform node to the scene", 
			key: MeshKey.ADD_TRANSFORM_NODE, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.TRANSFORM_NODE, 
			action: () => editor && addTransformNode(editor) },
		{ 
			text: "Box Mesh", 
			label: "Add a new box mesh to the scene", 
			key: MeshKey.ADD_BOX_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.BOX_MESH,
			action: () => editor && addBoxMesh(editor) },
		{ 
			text: "Plane Mesh", 
			label: "Add a new plane mesh to the scene", 
			key: MeshKey.ADD_PLANE_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.PLANE_MESH, 
			action: () => editor && addPlaneMesh(editor) },
		{ 
			text: "Ground Mesh", 
			label: "Add a new ground mesh to the scene", 
			key: MeshKey.ADD_GROUND_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.GROUND_MESH, 
			action: () => editor && addGroundMesh(editor) },
		{ 
			text: "Sphere Mesh", 
			label: "Add a new sphere mesh to the scene", 
			key: MeshKey.ADD_SPHERE_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.SPHERE_MESH, 
			action: () => editor && addSphereMesh(editor) },
		{ 
			text: "Skybox Mesh", 
			label: "Add a new skybox mesh to the scene", 
			key: MeshKey.ADD_SKYBOX_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.SKYBOX_MESH, 
			action: () => editor && addSkyboxMesh(editor) },
		{ 
			text: "Empty Mesh", 
			label: "Add a new empty mesh to the scene", 
			key: MeshKey.ADD_EMPTY_MESH, 
			ipcRendererChannelKey: MeshIPCRendererChannelKey.EMPTY_MESH, 
			action: () => editor && addEmptyMesh(editor) },
	];
}


