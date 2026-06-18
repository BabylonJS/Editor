import { describe, beforeEach, test, expect } from "vitest";

import { ISceneDecoratorData } from "../../src/decorators/apply";
import {
	visibleAsBoolean,
	visibleAsColor3,
	visibleAsColor4,
	visibleAsNumber,
	visibleAsVector2,
	visibleAsVector3,
	visibleAsTexture,
	visibleAsEntity,
	visibleAsKeyMap,
	visibleAsString,
	visibleAsAsset,
} from "../../src/decorators/inspector";

describe("decorators/inspector", () => {
	let target: {
		constructor: ISceneDecoratorData;
	};

	beforeEach(() => {
		target = {
			constructor: {} as ISceneDecoratorData,
		};
	});

	describe("@visibleAsBoolean", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsBoolean("test");
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
		});
	});

	describe("@visibleAsString", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsString("test");
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
		});
	});

	describe("@visibleAsNumber", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsNumber("test", {
				step: 0.1,
				min: 10,
				max: 20,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "number",
				step: 0.1,
				min: 10,
				max: 20,
			});
		});
	});

	describe("@visibleAsVector2", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsVector2("test", {
				step: 0.1,
				min: 10,
				max: 20,
				asDegrees: true,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "vector2",
				step: 0.1,
				min: 10,
				max: 20,
				asDegrees: true,
			});
		});
	});

	describe("@visibleAsVector3", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsVector3("test", {
				step: 0.1,
				min: 10,
				max: 20,
				asDegrees: true,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "vector3",
				step: 0.1,
				min: 10,
				max: 20,
				asDegrees: true,
			});
		});
	});

	describe("@visibleAsColor3", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsColor3("test", {
				noClamp: true,
				noColorPicker: true,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "color3",
				noClamp: true,
				noColorPicker: true,
			});
		});
	});

	describe("@visibleAsColor4", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsColor4("test", {
				noClamp: true,
				noColorPicker: true,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "color4",
				noClamp: true,
				noColorPicker: true,
			});
		});
	});

	describe("@visibleAsEntity", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsEntity("node", "test");
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "entity",
				entityType: "node",
			});
		});
	});

	describe("@visibleAsTexture", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsTexture("test", {
				onlyCubes: false,
				acceptCubes: false,
			});
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "texture",
				onlyCubes: false,
				acceptCubes: false,
			});
		});
	});

	describe("@visibleAsKeyMap", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsKeyMap("test");
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "keymap",
			});
		});
	});

	describe("@visibleAsAsset", () => {
		test("should add configuration to the target", () => {
			const fn = visibleAsAsset("nodeParticleSystemSet", "test");
			fn(target, "testProperty");

			expect(target.constructor._VisibleInInspector).toBeDefined();
			expect(target.constructor._VisibleInInspector!.length).toBe(1);
			expect(target.constructor._VisibleInInspector![0].label).toBe("test");
			expect(target.constructor._VisibleInInspector![0].propertyKey).toBe("testProperty");
			expect(target.constructor._VisibleInInspector![0].configuration).toEqual({
				type: "asset",
				assetType: "nodeParticleSystemSet",
			});
		});
	});
});
