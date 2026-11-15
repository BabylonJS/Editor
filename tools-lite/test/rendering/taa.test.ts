import { beforeAll, describe, expect, test, vi } from "vitest";

import { Camera, SceneContext } from "@babylonjs/lite";

import { Halton2DSequence } from "../../src/rendering/taa/halton";
import { TAARenderingPipeline } from "../../src/rendering/taa/pipeline";

/**
 * Creates a scene with a fake device: the pipeline only creates its history textures when constructed.
 */
function createFakeScene(width: number = 1280, height: number = 720): { scene: SceneContext; camera: Camera; destroyedTextures: string[] } {
	const destroyedTextures: string[] = [];
	const device = {
		createTexture: (descriptor: GPUTextureDescriptor) => ({
			createView: () => ({}),
			destroy: () => destroyedTextures.push(descriptor.label!),
		}),
	};

	const camera = { fov: 0.8, nearPlane: 1, farPlane: 1000, children: [] } as unknown as Camera;
	const scene = { surface: { engine: { _device: device }, canvas: { width, height } }, camera, lights: [] } as unknown as SceneContext;

	return { scene, camera, destroyedTextures };
}

// Values of the Halton sequence of Babylon.js 9.27 (8 samples): the first sample, then the next ones divided by 640x360.
const babylonSequence = [
	[0, -0.16666666666666669],
	[-0.000390625, 0.00046296296296296287],
	[0.000390625, -0.001080246913580247],
	[-0.0005859375, -0.00015432098765432107],
	[0.0001953125, 0.0007716049382716047],
	[-0.0001953125, -0.000771604938271605],
	[0.0005859375, 0.00015432098765432107],
	[-0.00068359375, 0.0010802469135802468],
	[0, -0.00046296296296296303],
	[-0.000390625, 0.00046296296296296287],
];

describe("rendering/taa", () => {
	beforeAll(() => {
		// The flags of the WebGPU API, not defined by Node.js.
		vi.stubGlobal("GPUTextureUsage", { COPY_SRC: 1, COPY_DST: 2, TEXTURE_BINDING: 4, STORAGE_BINDING: 8, RENDER_ATTACHMENT: 16 });
	});

	describe("Halton2DSequence", () => {
		test("should generate the same sequence as Babylon.js", () => {
			const sequence = new Halton2DSequence(8);
			const values = [[sequence.x, sequence.y]];

			sequence.setDimensions(640, 360);
			for (let i = 0; i < 9; ++i) {
				sequence.next();
				values.push([sequence.x, sequence.y]);
			}

			values.forEach((value, index) => {
				expect(value[0]).toBeCloseTo(babylonSequence[index][0], 12);
				expect(value[1]).toBeCloseTo(babylonSequence[index][1], 12);
			});
		});

		test("should restart from the first sample when regenerated", () => {
			const sequence = new Halton2DSequence(8);
			sequence.next();
			sequence.next();

			sequence.regenerate(4);
			expect(sequence.x).toBe(0);
			expect(sequence.y).toBeCloseTo(-1 / 6, 12);
		});
	});

	describe("TAARenderingPipeline", () => {
		test("should have the default values of Babylon.js", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			expect(pipeline.samples).toBe(8);
			expect(pipeline.factor).toBe(0.05);
			expect(pipeline.msaaSamples).toBe(1);
			expect(pipeline.clampHistory).toBe(false);
			expect(pipeline.reprojectHistory).toBe(false);
			expect(pipeline.disableOnCameraMove).toBe(true);
			expect(pipeline.isEnabled).toBe(true);
			expect(pipeline.getClassName()).toBe("TAARenderingPipeline");
			expect(pipeline.textureWidth).toBe(1280);
			expect(pipeline.textureHeight).toBe(720);
		});

		test("should reset the sequence when creating the history textures, as Babylon.js does", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);
			const sequence = (pipeline as any)._hs as Halton2DSequence;

			// The sequence is reset once per dimension of the history textures: the third sample is the current one.
			expect(sequence.x).toBeCloseTo(babylonSequence[2][0], 12);
			expect(sequence.y).toBeCloseTo(babylonSequence[2][1], 12);
		});

		test("should jitter the projection of the cameras that didn't move", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);
			const jitters = (pipeline as any)._projectionJitters as Map<Camera, { x: number; y: number }>;

			(pipeline as any)._updateJitter(camera, false, []);
			expect(jitters.get(camera)!.x).toBeCloseTo(babylonSequence[2][0], 12);
			expect(jitters.get(camera)!.y).toBeCloseTo(babylonSequence[2][1], 12);

			// The jitter is kept when the camera moves, the sequence still advances.
			(pipeline as any)._updateJitter(camera, true, []);
			expect(jitters.get(camera)!.x).toBeCloseTo(babylonSequence[2][0], 12);
			expect((pipeline as any)._hs.x).toBeCloseTo(babylonSequence[4][0], 12);
		});

		test("should jitter the vertices of the materials when the history is reprojected", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			// Babylon.js resets the sequence when the reprojection is enabled (the velocity may be outdated).
			pipeline.reprojectHistory = true;
			expect((pipeline as any)._hs.x).toBeCloseTo(babylonSequence[3][0], 12);

			(pipeline as any)._updateJitter(camera, false, []);
			expect((pipeline as any)._materialJitter.x).toBeCloseTo(babylonSequence[4][0], 12);
			expect((pipeline as any)._materialJitter.y).toBeCloseTo(babylonSequence[4][1], 12);

			// The sequence doesn't advance while the camera moves.
			(pipeline as any)._updateJitter(camera, true, []);
			expect((pipeline as any)._materialJitter.x).toBeCloseTo(babylonSequence[4][0], 12);

			pipeline.disableOnCameraMove = false;
			(pipeline as any)._updateJitter(camera, true, []);
			expect((pipeline as any)._materialJitter.x).toBeCloseTo(babylonSequence[5][0], 12);
		});

		test("should regenerate the sequence when the number of samples changes", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			pipeline.samples = 4;
			expect(pipeline.samples).toBe(4);
			expect((pipeline as any)._hs.x).toBeCloseTo(0, 12);
		});

		test("should render only the cameras it is attached to while enabled", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			expect(pipeline.isActiveForCamera(camera)).toBe(true);
			expect(pipeline.isActiveForCamera({} as Camera)).toBe(false);

			pipeline.isEnabled = false;
			expect(pipeline.isActiveForCamera(camera)).toBe(false);

			pipeline.isEnabled = true;
			expect(pipeline.isActiveForCamera(camera)).toBe(true);
		});

		test("should render the scene with the MSAA samples of the pipeline", () => {
			const { scene, camera } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			pipeline.msaaSamples = 4;
			expect(pipeline.getSceneSamples()).toBe(4);
		});

		test("should release the history textures when disposed", () => {
			const { scene, camera, destroyedTextures } = createFakeScene();
			const pipeline = new TAARenderingPipeline("taa", scene, [camera]);

			pipeline.dispose();
			expect(pipeline.isDisposed).toBe(true);
			expect(pipeline.isActiveForCamera(camera)).toBe(false);
			expect(destroyedTextures).toEqual(["TAAPing", "TAAPong"]);
		});
	});
});
