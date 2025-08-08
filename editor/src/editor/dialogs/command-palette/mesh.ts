import { Node } from "babylonjs";

import { Editor } from "../../main";

import { addTransformNode, addBoxMesh, addGroundMesh, addSphereMesh, addPlaneMesh, addSkyboxMesh, addEmptyMesh, addModelMesh } from "../../../project/add/mesh";

import { meshCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getMeshCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...meshCommandItems.transformNode,
			action: () => editor && addTransformNode(editor, parent),
		},
		{
			...meshCommandItems.box,
			action: () => editor && addBoxMesh(editor, parent),
		},
		{
			...meshCommandItems.plane,
			action: () => editor && addPlaneMesh(editor, parent),
		},
		{
			...meshCommandItems.ground,
			action: () => editor && addGroundMesh(editor, parent),
		},
		{
			...meshCommandItems.sphere,
			action: () => editor && addSphereMesh(editor, parent),
		},
		{
			...meshCommandItems.skybox,
			action: () => editor && addSkyboxMesh(editor, parent),
		},
		{
			...meshCommandItems.emptyMesh,
			action: () => editor && addEmptyMesh(editor, parent),
		},
		{
			...meshCommandItems.modelMesh,
			action: () => editor && addModelMesh(editor, parent),
		},
	];
}
