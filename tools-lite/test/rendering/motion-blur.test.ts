import { afterEach, describe, expect, test } from "vitest";

import { Camera, Mesh, SceneContext } from "@babylonjs/lite";

import { IPostProcessBeforeRenderContext, IPostProcessGeometryRequest } from "../../src/rendering/post-process/context";
import {
	createMotionBlurPostProcess,
	disposeMotionBlurPostProcess,
	getMotionBlurPostProcess,
	MotionBlurPostProcess,
	parseMotionBlurPostProcess,
	serializeMotionBlurPostProcess,
} from "../../src/rendering/motion-blur";

/**
 * Creates a scene without canvas: the post-process computes the view projection of its camera only when rendering.
 */
function createFakeScene(): { scene: SceneContext; camera: Camera } {
	const camera = { fov: 0.8, nearPlane: 1, farPlane: 1000, children: [] } as unknown as Camera;
	const scene = { surface: { engine: { _device: {} }, canvas: null }, camera, lights: [] } as unknown as SceneContext;

	return { scene, camera };
}

function getRequests(postProcess: MotionBlurPostProcess): IPostProcessGeometryRequest[] {
	const requests: IPostProcessGeometryRequest[] = [];
	postProcess.beforeRender({ requestGeometry: (request: IPostProcessGeometryRequest) => requests.push(request) } as unknown as IPostProcessBeforeRenderContext);

	return requests;
}

describe("rendering/motion-blur", () => {
	afterEach(() => {
		disposeMotionBlurPostProcess();
	});

	test("should have the default values of Babylon.js", () => {
		const { scene, camera } = createFakeScene();
		const postProcess = new MotionBlurPostProcess("motionBlur", scene, 1, camera);

		expect(postProcess.motionStrength).toBe(1);
		expect(postProcess.motionBlurSamples).toBe(32);
		expect(postProcess.isObjectBased).toBe(true);
		expect(postProcess.getClassName()).toBe("MotionBlurPostProcess");
		expect(postProcess.cameras).toEqual([camera]);
		expect(postProcess.isActiveForCamera(camera)).toBe(true);
		expect(postProcess.isActiveForCamera({} as Camera)).toBe(false);

		postProcess.dispose();
		expect(postProcess.isDisposed).toBe(true);
		expect(postProcess.isActiveForCamera(camera)).toBe(false);
	});

	test("should request the geometry of the pre-pass renderer of Babylon.js", () => {
		const { scene, camera } = createFakeScene();
		const postProcess = new MotionBlurPostProcess("motionBlur", scene, 1, camera);

		// Object based: the velocity of the meshes, screen based: the depth of the scene.
		expect(getRequests(postProcess)).toEqual([{ velocity: true }]);

		postProcess.isObjectBased = false;
		expect(getRequests(postProcess)).toEqual([{ viewDepth: true }]);

		postProcess.dispose();
	});

	test("should keep the list of the excluded skinned meshes", () => {
		const { scene, camera } = createFakeScene();
		const postProcess = new MotionBlurPostProcess("motionBlur", scene, 1, camera);
		const mesh = {} as Mesh;

		postProcess.excludeSkinnedMesh(mesh);
		postProcess.excludeSkinnedMesh(mesh);
		expect((postProcess as any)._excludedSkinnedMeshes).toEqual([mesh]);

		postProcess.removeExcludedSkinnedMesh(mesh);
		expect((postProcess as any)._excludedSkinnedMeshes).toEqual([]);

		postProcess.dispose();
	});

	test("should serialize and parse the configuration as the tools do", () => {
		const { scene, camera } = createFakeScene();

		const postProcess = createMotionBlurPostProcess(scene, camera, { msaaSamples: 4 } as any);
		expect(getMotionBlurPostProcess()).toBe(postProcess);
		expect(postProcess.samples).toBe(4);

		postProcess.isObjectBased = false;
		postProcess.motionStrength = 2.5;
		postProcess.motionBlurSamples = 16;

		const data = serializeMotionBlurPostProcess();
		expect(data).toEqual({ isObjectBased: false, motionStrength: 2.5, motionBlurSamples: 16 });

		disposeMotionBlurPostProcess();
		expect(getMotionBlurPostProcess()).toBeNull();
		expect(serializeMotionBlurPostProcess()).toBeNull();

		const parsed = parseMotionBlurPostProcess(scene, camera, data);
		expect(parsed.isObjectBased).toBe(false);
		expect(parsed.motionStrength).toBe(2.5);
		expect(parsed.motionBlurSamples).toBe(16);
		expect(parsed.samples).toBe(1);
	});
});
