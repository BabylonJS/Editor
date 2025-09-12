import { ISceneDecoratorData } from "../../src/decorators/apply";
import { onPointerEvent, onKeyboardEvent } from "../../src/decorators/events";

describe("decorators/inspector", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@onPointerEvent", () => {
		test("should add configuration to the target", () => {
			const fn = onPointerEvent(2);
			fn(target, "testProperty");

			expect(target.constructor._PointerEvents).toBeDefined();
			expect(target.constructor._PointerEvents.length).toBe(1);
			expect(target.constructor._PointerEvents[0].propertyKey).toBe("testProperty");
			expect(target.constructor._PointerEvents[0].onlyWhenMeshPicked).toBe(true);
			expect(target.constructor._PointerEvents[0].eventTypes).toStrictEqual([2]);
		});
	});

	describe("@onKeyboardEvent", () => {
		test("should add configuration to the target", () => {
			const fn = onKeyboardEvent(2);
			fn(target, "testProperty");

			expect(target.constructor._KeyboardEvents).toBeDefined();
			expect(target.constructor._KeyboardEvents.length).toBe(1);
			expect(target.constructor._KeyboardEvents[0].propertyKey).toBe("testProperty");
			expect(target.constructor._KeyboardEvents[0].eventTypes).toStrictEqual([2]);
		});
	});
});
