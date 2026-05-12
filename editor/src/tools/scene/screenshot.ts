import { writeFile } from "fs-extra";

import { Scene, ISize } from "babylonjs";

import { saveSingleFileDialog } from "../dialog";

/**
 * Takes a screenshot of the scene and returns its base64 value.
 * @param scene defines the reference to the scene to take a screenshot.
 * @param size defines the optional size of the screenshot. If not provided, the current canvas size will be used.
 */
export function getBase64SceneScreenshot(scene: Scene, size?: ISize) {
	return new Promise<string | undefined>((resolve) => {
		scene.onAfterRenderObservable.addOnce(() => {
			const engine = scene.getEngine();

			if (size) {
				const canvas = engine.getRenderingCanvas();
				if (canvas) {
					canvas.width = size.width;
					canvas.height = size.height;
					engine.setHardwareScalingLevel(0.25);
					engine.resize();
					scene.render();
				}
			}

			resolve(scene.getEngine().getRenderingCanvas()?.toDataURL("image/png"));

			if (size) {
				engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
				engine.resize();
			}
		});
	});
}

/**
 * Takes a screenshot of the scene and returns its buffer value.
 * @param scene defines the reference to the scene to take a screenshot.
 * @param size defines the optional size of the screenshot. If not provided, the current canvas size will be used.
 */
export async function getBufferSceneScreenshot(scene: Scene, size?: ISize) {
	const base64 = await getBase64SceneScreenshot(scene, size);
	if (!base64) {
		return null;
	}

	return Buffer.from(base64?.split(",")[1], "base64");
}

/**
 * Takes a screenshot of the scene and asks the user to save the generate PNG file.
 * @param scene defines the reference to the scene to take a screenshot.
 * @param size defines the optional size of the screenshot. If not provided, the current canvas size will be used.
 */
export async function saveSceneScreenshot(scene: Scene, size?: ISize) {
	const buffer = await getBufferSceneScreenshot(scene, size);
	if (!buffer) {
		return;
	}

	const filepath = saveSingleFileDialog({
		title: "Save scene screenshot",
		filters: [{ name: "PNG Image", extensions: ["png"] }],
	});

	if (filepath) {
		await writeFile(filepath, buffer);
	}
}
