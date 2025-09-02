import { readJSON } from "fs-extra";

import "babylonjs-materials";
import { Engine, Scene, ArcRotateCamera, Vector3, Mesh, MeshBuilder, HemisphericLight, Material, CubeTexture } from "babylonjs";

import { readBlobAsDataUrl } from "../../tools";

let engine: Engine;
let scene: Scene;
let sphere: Mesh;
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

		new ArcRotateCamera("camera", Math.PI * 0.25, Math.PI * 0.25, 10, Vector3.Zero(), scene);
		new HemisphericLight("light", new Vector3(0, 1, 0), scene);

		sphere = MeshBuilder.CreateSphere("sphere", {
			diameter: 5,
			segments: 32,
		});

		if (serializedEnvironmentTexture) {
			environmentTexture = CubeTexture.Parse(serializedEnvironmentTexture, scene, rootUrl);
			scene.environmentTexture = environmentTexture;
		}
	}

	const materialData = await readJSON(absolutePath);
	const material = Material.Parse(materialData, scene, rootUrl);

	sphere.material = material;

	return new Promise<string>((resolve) => {
		scene.executeWhenReady(async () => {
			scene.render();

			material?.dispose(false, true);

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
