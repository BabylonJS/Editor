import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

export async function loadScene(rootUrl: string, sceneFilename: string, scene: Scene) {
    await SceneLoader.AppendAsync(rootUrl, sceneFilename, scene);
}
