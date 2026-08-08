export const loadSceneWithGaussianSplatting = `
import { loadScene } from "babylonjs-editor-tools";

import "babylonjs-editor-tools/loading/gaussian-splatting";

// ...

await loadScene("/scene/", "my-scene.babylon", scene, scriptsMap, {
    quality: "high",
});
`;
