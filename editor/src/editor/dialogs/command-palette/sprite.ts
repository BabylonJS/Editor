import { Node } from "babylonjs";

import { Editor } from "../../main";

import { spriteCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

import { addSpriteMapNode } from "../../../project/add/sprite";

export function getSpriteCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...spriteCommandItems.spriteMap,
			action: () => editor && addSpriteMapNode(editor, parent),
		},
	];
}
