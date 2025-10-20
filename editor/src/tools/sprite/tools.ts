import { Sprite } from "babylonjs";

import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";

import { isSpriteManagerNode } from "../guards/sprites";

export function getSpriteManagerNodeFromSprite(sprite: Sprite) {
	const scene = sprite.manager.scene;

	const spriteManagerNode = scene.transformNodes.find((node) => {
		return isSpriteManagerNode(node) && node.spriteManager === sprite.manager;
	});

	return (spriteManagerNode as SpriteManagerNode) ?? null;
}

export function cloneSprite(sprite: Sprite) {
	const spriteManagerNode = getSpriteManagerNodeFromSprite(sprite);
	if (!spriteManagerNode?.spriteManager) {
		return null;
	}

	const suffix = "(Clone)";
	const name = `${sprite.name.replace(` ${suffix}`, "")} ${suffix}`;

	const clone = new Sprite(name, spriteManagerNode.spriteManager);
	clone.width = sprite.width;
	clone.height = sprite.height;
	clone.position = sprite.position.clone();
	clone.angle = sprite.angle;
	clone.invertU = sprite.invertU;
	clone.invertV = sprite.invertV;
	clone.isVisible = sprite.isVisible;
	clone.cellIndex = sprite.cellIndex;
	clone.cellRef = sprite.cellRef;
	clone.metadata = sprite.metadata;

	return clone;
}
