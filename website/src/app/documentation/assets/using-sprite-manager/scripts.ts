export const assignScriptSprite = `
import { Sprite } from "@babylonjs/core/Sprites/sprite";

export default class MySpriteComponent {
	public constructor(public sprite: Sprite) {}

	public onUpdate(): void {
		this.sprite.angle += 0.04 * this.sprite.manager.scene.getAnimationRatio();
	}
}
`;

export const playAnimationSprite = `
import { Sprite } from "@babylonjs/core/Sprites/sprite";

import { playSpriteAnimationFromName } from "babylonjs-editor-tools";

export default class MySpriteComponent {
	public constructor(public sprite: Sprite) {}

	public onStart(): void {
		playSpriteAnimationFromName(this.sprite, "all");
	}
}
`;

export const getAnimationSprite = `
import { Sprite } from "@babylonjs/core/Sprites/sprite";

import { animationFromSprite, ISpriteAnimation } from "babylonjs-editor-tools";

export default class MySpriteComponent {
	@animationFromSprite("water")
	private _waterAnimation!: ISpriteAnimation;

	public constructor(public sprite: Sprite) {}

	public onStart(): void {
		this.sprite.playAnimation(this._waterAnimation.from, this._waterAnimation.to, true, this._waterAnimation.delay);
	}
}
`;

export const assignScriptSpriteManager = `
import { SpriteManagerNode } from "babylonjs-editor-tools";

export default class MySpriteManagerNodeComponent {
	public constructor(public node: SpriteManagerNode) {}

	public onUpdate(): void {
		this.node.spriteManager?.sprites.forEach((sprite) => {
			sprite.angle += 0.04 * this.node.getScene().getAnimationRatio();
		});
	}
}
`;
