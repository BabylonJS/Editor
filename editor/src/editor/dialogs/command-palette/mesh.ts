import { Node } from "babylonjs";

import { Editor } from "../../main";

import {
	addBoxMesh,
	addGroundMesh,
	addSphereMesh,
	addPlaneMesh,
	addSkyboxMesh,
	addEmptyMesh,
	addCapsuleMesh,
	addCylinderMesh,
	addTorusMesh,
	addTorusKnotMesh,
} from "../../../project/add/mesh";

import { meshCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

export function getMeshCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
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
			...meshCommandItems.capsule,
			action: () => editor && addCapsuleMesh(editor, parent),
		},
		{
			...meshCommandItems.cylinder,
			action: () => editor && addCylinderMesh(editor, parent),
		},
		{
			...meshCommandItems.torus,
			action: () => editor && addTorusMesh(editor, parent),
		},
		{
			...meshCommandItems.torusKnot,
			action: () => editor && addTorusKnotMesh(editor, parent),
		},
		{
			...meshCommandItems.skybox,
			action: () => editor && addSkyboxMesh(editor, parent),
		},
		{
			...meshCommandItems.emptyMesh,
			action: () => editor && addEmptyMesh(editor, parent),
		},
	];
}
