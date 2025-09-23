import { soundFromScene } from "../../src/decorators/sound";
import { ISceneDecoratorData } from "../../src/decorators/apply";

describe("decorators/sound", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@soundFromScene", () => {
		test("should add configuration to the target", () => {
			const fn = soundFromScene("test");
			fn(target, "testProperty");

			expect(target.constructor._SoundsFromScene).toBeDefined();
			expect(target.constructor._SoundsFromScene!.length).toBe(1);
			expect(target.constructor._SoundsFromScene![0].soundName).toBe("test");
			expect(target.constructor._SoundsFromScene![0].propertyKey).toBe("testProperty");
		});
	});
});
