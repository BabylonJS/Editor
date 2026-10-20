import { describe, expect, test, beforeEach, afterEach } from "vitest";

import { NullEngine, Scene, PBRMaterial, StandardMaterial, Texture } from "babylonjs";

import { convertEmissiveLightmap } from "../../../src/tools/material/lightmap";

describe("tools/material/lightmap", () => {
	let engine: NullEngine;
	let scene: Scene;

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);
	});

	afterEach(() => {
		scene.dispose();
		engine.dispose();
	});

	function createBakedMaterial(coordinatesIndex: number) {
		const material = new PBRMaterial("baked", scene);
		material.emissiveTexture = new Texture(null, scene);
		material.emissiveTexture.coordinatesIndex = coordinatesIndex;
		material.emissiveColor.set(1, 1, 1);
		return material;
	}

	test("moves an emissive texture on the second uv set to the lightmap slot", () => {
		const material = createBakedMaterial(1);
		const atlas = material.emissiveTexture;

		expect(convertEmissiveLightmap(material)).toBe(true);

		expect(material.lightmapTexture).toBe(atlas);
		expect(material.useLightmapAsShadowmap).toBe(true);
		expect(material.emissiveTexture).toBeNull();
		expect(material.emissiveColor.asArray()).toEqual([0, 0, 0]);
	});

	test("makes the material unlit so the bake is not shaded a second time", () => {
		const material = createBakedMaterial(1);

		convertEmissiveLightmap(material);

		expect(material.unlit).toBe(true);
	});

	test("carries the emissive strength over as the lightmap level", () => {
		const material = createBakedMaterial(1);
		material.emissiveIntensity = 1.6448;

		convertEmissiveLightmap(material);

		expect(material.lightmapTexture!.level).toBeCloseTo(1.6448);
		expect(material.emissiveIntensity).toBe(1);
	});

	test("folds the emissive factor into the level", () => {
		const material = createBakedMaterial(1);
		material.emissiveColor.set(0.5, 0.5, 0.5);
		material.emissiveIntensity = 2;

		convertEmissiveLightmap(material);

		expect(material.lightmapTexture!.level).toBeCloseTo(1);
	});

	test("leaves genuine emission on the first uv set alone", () => {
		const material = createBakedMaterial(0);
		const texture = material.emissiveTexture;

		expect(convertEmissiveLightmap(material)).toBe(false);

		expect(material.emissiveTexture).toBe(texture);
		expect(material.lightmapTexture).toBeNull();
		expect(material.unlit).toBe(false);
	});

	test("is idempotent, so a material shared by several meshes converts once", () => {
		const material = createBakedMaterial(1);
		material.emissiveIntensity = 1.6448;

		expect(convertEmissiveLightmap(material)).toBe(true);
		expect(convertEmissiveLightmap(material)).toBe(false);

		expect(material.lightmapTexture!.level).toBeCloseTo(1.6448);
	});

	test("ignores materials that are not PBR", () => {
		const material = new StandardMaterial("standard", scene);
		material.emissiveTexture = new Texture(null, scene);
		material.emissiveTexture.coordinatesIndex = 1;

		expect(convertEmissiveLightmap(material)).toBe(false);
		expect(material.lightmapTexture).toBeNull();
	});
});
