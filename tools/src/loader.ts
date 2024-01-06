import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { parseSSRRenderingPipeline } from "./rendering/ssr";
import { parseSSAO2RenderingPipeline } from "./rendering/ssao";
import { parseMotionBlurPostProcess } from "./rendering/motion-blur";
import { parseDefaultRenderingPipeline } from "./rendering/default-pipeline";

export type ScriptMap = Record<
    string,
    {
        default?: new (object: any) => {
            onStart?(): void;
            onUpdate?(): void;
        };
    }
>;

export async function loadScene(rootUrl: string, sceneFilename: string, scene: Scene, scriptsMap: ScriptMap) {
    await SceneLoader.AppendAsync(rootUrl, sceneFilename, scene);

    if (scene.metadata?.rendering) {
        const camera = scene.activeCamera ?? scene.cameras[0];

        if (scene.metadata.rendering.ssao2RenderingPipeline) {
            parseSSAO2RenderingPipeline(scene, camera, scene.metadata.rendering.ssao2RenderingPipeline);
        }

        if (scene.metadata.rendering.ssrRenderingPipeline) {
            parseSSRRenderingPipeline(scene, camera, scene.metadata.rendering.ssrRenderingPipeline);
        }

        if (scene.metadata.rendering.motionBlurPostProcess) {
            parseMotionBlurPostProcess(scene, camera, scene.metadata.rendering.motionBlurPostProcess);
        }

        if (scene.metadata.rendering.defaultRenderingPipeline) {
            parseDefaultRenderingPipeline(scene, camera, scene.metadata.rendering.defaultRenderingPipeline);
        }
    }

    loadScriptsFor(scene, scene, scriptsMap);
    scene.transformNodes.forEach((transformNode) => loadScriptsFor(scene, transformNode, scriptsMap));
    scene.meshes.forEach((mesh) => loadScriptsFor(scene, mesh, scriptsMap));
    scene.lights.forEach((light) => loadScriptsFor(scene, light, scriptsMap));
    scene.cameras.forEach((camera) => loadScriptsFor(scene, camera, scriptsMap));
}

export function loadScriptsFor(scene: Scene, object: any, scriptsMap: ScriptMap): void {
    if (!object.metadata) {
        return;
    }

    object.metadata.scripts?.forEach((script) => {
        if (!script.enabled) {
            return;
        }

        const exports = scriptsMap[script.key];
        if (!exports) {
            return;
        }

        if (exports.default) {
            const instance = new exports.default(object);

            if (instance.onStart) {
                scene.onBeforeRenderObservable.addOnce(() => instance.onStart!());
            }

            if (instance.onUpdate) {
                scene.onBeforeRenderObservable.add(() => instance.onUpdate!());
            }
        }
    });

    object.metadata.scripts = undefined;
}
