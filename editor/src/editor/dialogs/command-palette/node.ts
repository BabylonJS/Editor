import { Node } from "babylonjs";

import { Editor } from "../../main";

import { nodeCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

import { addTransformNode } from "../../../project/add/node";

export function getNodeCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...nodeCommandItems.transformNode,
			action: () => editor && addTransformNode(editor, parent),
		},
	];
}
