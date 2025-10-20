import { Node } from "babylonjs";

import { Editor } from "../../main";

import { spriteCommandItems } from "./shared-commands";
import { ICommandPaletteType } from "./command-palette";

import { addSpriteManager, addSpriteMapNode } from "../../../project/add/sprite";

export function getSpriteCommands(editor?: Editor, parent?: Node): ICommandPaletteType[] {
	return [
		{
			...spriteCommandItems.spriteManager,
			action: () => editor && addSpriteManager(editor, parent),
		},
		{
			...spriteCommandItems.spriteMap,
			action: () => editor && addSpriteMapNode(editor, parent),
		},
	];
}
