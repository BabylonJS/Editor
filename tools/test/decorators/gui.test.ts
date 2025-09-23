import { guiFromAsset } from "../../src/decorators/gui";
import { ISceneDecoratorData } from "../../src/decorators/apply";

describe("decorators/gui", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@guiFromAsset", () => {
		test("should add configuration to the target", () => {
			const fn = guiFromAsset("test");
			fn(target, "testProperty");

			expect(target.constructor._GuiFromAsset).toBeDefined();
			expect(target.constructor._GuiFromAsset!.length).toBe(1);
			expect(target.constructor._GuiFromAsset![0].pathInAssets).toBe("test");
			expect(target.constructor._GuiFromAsset![0].propertyKey).toBe("testProperty");
		});
	});
});
