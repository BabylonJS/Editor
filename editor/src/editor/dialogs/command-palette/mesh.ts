import { Editor } from "../../main";

import {
	addTransformNode, addBoxMesh, addGroundMesh, addSphereMesh, addPlaneMesh, addSkyboxMesh,
	addEmptyMesh,
} from "../../../project/add/mesh";

import { meshCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getMeshCommands(editor?: Editor): ICommandPaletteType[] {
	return [
		{
			...meshCommandItems.transformNode,
			action: () => editor && addTransformNode(editor)
		},
		{
			...meshCommandItems.box,
			action: () => editor && addBoxMesh(editor)
		},
		{
			...meshCommandItems.plane,
			action: () => editor && addPlaneMesh(editor)
		},
		{
			...meshCommandItems.ground,
			action: () => editor && addGroundMesh(editor)
		},
		{
			...meshCommandItems.sphere,
			action: () => editor && addSphereMesh(editor)
		},
		{
			...meshCommandItems.skybox,
			action: () => editor && addSkyboxMesh(editor)
		},
		{
			...meshCommandItems.emptyMesh,
			action: () => editor && addEmptyMesh(editor)
		},
	];
}




