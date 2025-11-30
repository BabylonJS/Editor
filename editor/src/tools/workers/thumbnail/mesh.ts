import "babylonjs-loaders";
import { Engine, Scene, FreeCamera, Vector3, CubeTexture, LoadAssetContainerAsync, RegisterSceneLoaderPlugin } from "babylonjs";

import { AssimpJSLoader } from "../../../loader/assimpjs";

import { readBlobAsDataUrl } from "../../tools";

import { getCameraFocusPositionFor } from "../../camera/focus";

import { forceCompileAllSceneMaterials } from "../../scene/materials";

RegisterSceneLoaderPlugin(new AssimpJSLoader(false));

let engine: Engine;
let scene: Scene;
let camera: FreeCamera;
let environmentTexture: CubeTexture;

export async function getPreview(absolutePath: string, rootUrl: string, serializedEnvironmentTexture?: any) {
	if (!engine) {
		engine = new Engine(new OffscreenCanvas(256, 256), true, {
			antialias: true,
			audioEngine: false,
			limitDeviceRatio: 1,
			adaptToDeviceRatio: false,
		});

		scene = new Scene(engine);
		scene.clearColor.set(0, 0, 0, 1);
		camera = new FreeCamera("camera", new Vector3(0, 0, 0), scene);

		scene.createDefaultLight();

		const helper = scene.createDefaultEnvironment({
			createSkybox: false,
			enableGroundShadow: true,
			enableGroundMirror: true,
		});

		if (helper?.ground) {
			helper.ground.position.y -= 1;
		}

		if (serializedEnvironmentTexture) {
			environmentTexture = CubeTexture.Parse(serializedEnvironmentTexture, scene, rootUrl);
			scene.environmentTexture = environmentTexture;
		}
	}

	const container = await LoadAssetContainerAsync(absolutePath, scene);
	container.addAllToScene();

	await forceCompileAllSceneMaterials(scene);

	return new Promise<string>((resolve) => {
		scene.executeWhenReady(async () => {
			const center = Vector3.Zero();
			const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
			const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

			container.meshes.forEach((mesh) => {
				mesh.refreshBoundingInfo({
					applyMorph: true,
					applySkeleton: true,
					updatePositionsArray: true,
				});

				const bb = mesh.getBoundingInfo().boundingBox;

				maximum.x = Math.max(bb.maximumWorld.x, maximum.x);
				maximum.y = Math.max(bb.maximumWorld.y, maximum.y);
				maximum.z = Math.max(bb.maximumWorld.z, maximum.z);

				minimum.x = Math.min(bb.minimumWorld.x, minimum.x);
				minimum.y = Math.min(bb.minimumWorld.y, minimum.y);
				minimum.z = Math.min(bb.minimumWorld.z, minimum.z);

				center.addInPlace(bb.centerWorld);
			});

			center.scaleInPlace(1 / container.meshes.length);

			camera.position = getCameraFocusPositionFor(center, camera, {
				minimum,
				maximum,
			});

			camera.target = center;

			scene.render();

			container.dispose();

			const canvas = engine.getRenderingCanvas() as unknown as OffscreenCanvas;
			const blob = await canvas.convertToBlob({
				quality: 1,
				type: "image/png",
			});

			resolve(await readBlobAsDataUrl(blob));
		});

		scene._checkIsReady();
	});
}
