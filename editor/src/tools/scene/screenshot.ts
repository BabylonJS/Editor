import { Scene } from "babylonjs";

/**
 * Takes a screenshot of the scene and returns its base64 value.
 * @param scene defines the reference to the scene to take a screenshot.
 */
export function getBase64SceneScreenshot(scene: Scene) {
    return new Promise<string | undefined>((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            resolve(scene.getEngine().getRenderingCanvas()?.toDataURL("image/png"));
        });
    });
}

/**
 * Takes a screenshot of the scene and returns its buffer value.
 * @param scene defines the reference to the scene to take a screenshot.
 */
export async function getBufferSceneScreenshot(scene: Scene) {
    const base64 = await getBase64SceneScreenshot(scene);
    if (!base64) {
        return null;
    }

    return Buffer.from(base64?.split(",")[1], "base64");
}
