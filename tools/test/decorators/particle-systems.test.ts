import { ISceneDecoratorData } from "../../src/decorators/apply";
import { particleSystemFromScene } from "../../src/decorators/particle-systems";

describe("decorators/particle-systems", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@particleSystemFromScene", () => {
		test("should add configuration to the target", () => {
			const fn = particleSystemFromScene("test");
			fn(target, "testProperty");

			expect(target.constructor._ParticleSystemsFromScene).toBeDefined();
			expect(target.constructor._ParticleSystemsFromScene!.length).toBe(1);
			expect(target.constructor._ParticleSystemsFromScene![0].particleSystemName).toBe("test");
			expect(target.constructor._ParticleSystemsFromScene![0].propertyKey).toBe("testProperty");
		});
	});
});
