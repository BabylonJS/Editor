import { Editor } from "../../main";

import {
	addTransformNode, addBoxMesh, addGroundMesh, addSphereMesh, addPlaneMesh, addSkyboxMesh,
	addEmptyMesh,
} from "../../../project/add/mesh";

import { ICommandPaletteType } from "./command-palette";

export function getMeshCommands(editor: Editor): ICommandPaletteType[] {
	return [
		{ text: "Add Transform Node", label: "Add a new transform node to the scene", action: () => addTransformNode(editor) },
		{ text: "Add Box Mesh", label: "Add a new box mesh to the scene", action: () => addBoxMesh(editor) },
		{ text: "Add Plane Mesh", label: "Add a new plane mesh to the scene", action: () => addPlaneMesh(editor) },
		{ text: "Add Ground Mesh", label: "Add a new ground mesh to the scene", action: () => addGroundMesh(editor) },
		{ text: "Add Sphere Mesh", label: "Add a new sphere mesh to the scene", action: () => addSphereMesh(editor) },
		{ text: "Add Skybox Mesh", label: "Add a new skybox mesh to the scene", action: () => addSkyboxMesh(editor) },
		{ text: "Add Empty Mesh", label: "Add a new empty mesh to the scene", action: () => addEmptyMesh(editor) },
	];
}
