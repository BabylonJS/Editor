import { describe, expect, test, beforeEach, afterEach } from "vitest";

import { NullEngine, Scene, Texture } from "babylonjs";

import { flipTextureV } from "../../../src/tools/material/texture";

describe("tools/material/texture", () => {
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

	/** Where the shader samples for a mesh uv: `textureMatrix * vec4(uv, 1, 0)`, second component. */
	function sampledV(texture: Texture, u: number, v: number) {
		const m = texture.getTextureMatrix().m;
		return u * m[1] + v * m[5] + m[9];
	}

	describe("flipTextureV", () => {
		test("keeps every sample inside 0..1, so a clamped texture is not pinned to its edge", () => {
			const texture = new Texture(null, scene);

			flipTextureV(texture);

			for (const v of [0, 0.25, 0.5, 0.75, 1]) {
				const sampled = sampledV(texture, 0.3, v);
				expect(sampled).toBeGreaterThanOrEqual(0);
				expect(sampled).toBeLessThanOrEqual(1);
			}
		});

		test("samples the mirrored row, which is the same texel once the image is flipped", () => {
			const texture = new Texture(null, scene);

			const before = [0.1, 0.4, 0.9].map((v) => sampledV(texture, 0.3, v));
			flipTextureV(texture);
			const after = [0.1, 0.4, 0.9].map((v) => sampledV(texture, 0.3, v));

			after.forEach((v, i) => expect(v).toBeCloseTo(1 - before[i]));
		});

		test("preserves an existing uv transform", () => {
			const texture = new Texture(null, scene);
			texture.vScale = 2;
			texture.vOffset = 0.25;

			const before = sampledV(texture, 0, 0.3);
			flipTextureV(texture);

			expect(sampledV(texture, 0, 0.3)).toBeCloseTo(1 - before);
		});

		test("marks the image as inverted", () => {
			// As the glTF loader creates them - Babylon's own default is already inverted.
			const texture = new Texture(null, scene, false, false);
			expect(texture.invertY).toBe(false);

			flipTextureV(texture);

			expect(texture.invertY).toBe(true);
		});
	});
});
