import "babylonjs-loaders";
import { Engine, Scene, CubeTexture, LoadAssetContainerAsync, RegisterSceneLoaderPlugin, Material, ArcRotateCamera } from "babylonjs";

import { AssimpJSLoader } from "../../../loader/assimpjs";

import { readBlobAsDataUrl } from "../../tools";

import { forceCompileAllSceneMaterials } from "../../scene/materials";

const assimpLoader = new AssimpJSLoader(false);
RegisterSceneLoaderPlugin(assimpLoader);

let engine: Engine;
let scene: Scene;

export async function getPreview(
	absolutePath: string,
	rootUrl: string,
	appPath: string | null,
	serializedEnvironmentTexture?: any,
	serializedOverrideMaterial?: any
): Promise<string> {
	if (appPath) {
		assimpLoader.appPath = appPath;
	}

	if (!engine) {
		engine = new Engine(new OffscreenCanvas(256, 256), true, {
			antialias: true,
			audioEngine: false,
			limitDeviceRatio: 1,
			adaptToDeviceRatio: false,
		});
	}

	scene?.dispose();
	scene = new Scene(engine);
	scene.clearColor.set(0, 0, 0, 1);

	if (serializedEnvironmentTexture) {
		const environmentTexture = CubeTexture.Parse(serializedEnvironmentTexture, scene, rootUrl);
		scene.environmentTexture = environmentTexture;
	}

	const container = await LoadAssetContainerAsync(absolutePath, scene);
	container.addAllToScene();

	if (serializedOverrideMaterial) {
		const overrideMaterial = Material.Parse(serializedOverrideMaterial, scene, rootUrl);
		container.meshes.forEach((mesh) => {
			mesh.material = overrideMaterial;
		});
	}

	return new Promise<string>((resolve) => {
		scene.executeWhenReady(async () => {
			scene.createDefaultCameraOrLight(true, true, true);
			scene.createDefaultEnvironment({
				createSkybox: true,
				enableGroundShadow: true,
				enableGroundMirror: true,
			});

			const camera = scene.activeCamera as ArcRotateCamera;
			camera.alpha = -Math.PI * 0.666;
			camera.beta = Math.PI * 0.35;

			await forceCompileAllSceneMaterials(scene);

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
