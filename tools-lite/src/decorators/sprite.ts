import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the sprite that has the given name.
 * Once the script is instantiated, the reference to the sprite is retrieved from the
 * sprite manager and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * This can be used only on SpriteManagerNode.
 * @param spriteName defines the name of the sprite to retrieve in scene.
 */
export function spriteFromSpriteManager(spriteName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._SpritesFromSpriteManager ??= [];
		ctor._SpritesFromSpriteManager.push({ propertyKey, spriteName });
	};
}

/**
 * Makes the decorated property linked to the sprite that has the given name.
 * Once the script is instantiated, the reference to the sprite is retrieved from the
 * sprite manager and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * This can be used only on SpriteManagerNode.
 * @param spriteName defines the name of the sprite to retrieve in scene.
 */
export function animationFromSprite(animationName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._AnimationsFromSprite ??= [];
		ctor._AnimationsFromSprite.push({ propertyKey, animationName });
	};
}
