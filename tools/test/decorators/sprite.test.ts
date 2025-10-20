import { ISceneDecoratorData } from "../../src/decorators/apply";
import { spriteFromSpriteManager, animationFromSprite } from "../../src/decorators/sprite";

describe("decorators/sprite", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@spriteFromSpriteManager", () => {
		test("should add configuration to the target", () => {
			const fn = spriteFromSpriteManager("test");
			fn(target, "testProperty");

			expect(target.constructor._SpritesFromSpriteManager).toBeDefined();
			expect(target.constructor._SpritesFromSpriteManager!.length).toBe(1);
			expect(target.constructor._SpritesFromSpriteManager![0].spriteName).toBe("test");
			expect(target.constructor._SpritesFromSpriteManager![0].propertyKey).toBe("testProperty");
		});
	});

	describe("@animationFromSprite", () => {
		test("should add configuration to the target", () => {
			const fn = animationFromSprite("test");
			fn(target, "testProperty");

			expect(target.constructor._AnimationsFromSprite).toBeDefined();
			expect(target.constructor._AnimationsFromSprite!.length).toBe(1);
			expect(target.constructor._AnimationsFromSprite![0].animationName).toBe("test");
			expect(target.constructor._AnimationsFromSprite![0].propertyKey).toBe("testProperty");
		});
	});
});
