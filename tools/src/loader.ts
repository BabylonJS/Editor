import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { parseSSRRenderingPipeline } from "./rendering/ssr";
import { parseSSAO2RenderingPipeline } from "./rendering/ssao";
import { parseMotionBlurPostProcess } from "./rendering/motion-blur";
import { parseDefaultRenderingPipeline } from "./rendering/default-pipeline";

import { applyDecorators } from "./decorators/apply";

import { configureShadowMapRefreshRate, configureShadowMapRenderListPredicate } from "./light";

import "./texture";

/**
 * Defines the possible output type of a script.
 * `default` is a class that will be instantiated with the object as parameter.
 * `onStart` is a function that will be called once before the first render passing the reference to the object the script is attached to.
 * `onUpdate` is a function that will be called every frame passing the reference to the object the script is attached to
 */
export type ScriptMap = Record<
    string,
    {
        default?: new (object: any) => {
            onStart?(): void;
            onUpdate?(): void;
        };
        onStart?: (object: any) => void;
        onUpdate?: (object: any) => void;
    }
>;

/**
 * Defines the overall desired quality of the scene.
 * In other words, defines the quality of textures that will be loaded in terms of dimensions.
 * The editor computes automatic "hight (untouched)", "medium (half)", and "low (quarter)" quality levels for textures.
 * Using "medium" or "low" quality levels will reduce the memory usage and improve the performance of the scene
 * especially on mobiles where memory is limited.
 */
export type SceneLoaderQualitySelector = "low" | "medium" | "high";

declare module "@babylonjs/core/scene" {
    interface Scene {
        loadingQuality: SceneLoaderQualitySelector;
    }
}

export async function loadScene(rootUrl: string, sceneFilename: string, scene: Scene, scriptsMap: ScriptMap, quality: SceneLoaderQualitySelector = "high") {
    scene.loadingQuality = quality;

    await SceneLoader.AppendAsync(rootUrl, sceneFilename, scene, null, ".babylon");

    configureShadowMapRenderListPredicate(scene);
    configureShadowMapRefreshRate(scene);

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

    loadScriptsFor(scene, scene, scriptsMap, rootUrl);
    scene.transformNodes.forEach((transformNode) => loadScriptsFor(scene, transformNode, scriptsMap, rootUrl));
    scene.meshes.forEach((mesh) => loadScriptsFor(scene, mesh, scriptsMap, rootUrl));
    scene.lights.forEach((light) => loadScriptsFor(scene, light, scriptsMap, rootUrl));
    scene.cameras.forEach((camera) => loadScriptsFor(scene, camera, scriptsMap, rootUrl));
}

export function loadScriptsFor(scene: Scene, object: any, scriptsMap: ScriptMap, rootUrl: string): void {
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

            applyDecorators(scene, object, instance, rootUrl);

            if (instance.onStart) {
                scene.onBeforeRenderObservable.addOnce(() => instance.onStart!());
            }

            if (instance.onUpdate) {
                scene.onBeforeRenderObservable.add(() => instance.onUpdate!());
            }
        } else {
            if (exports.onStart) {
                scene.onBeforeRenderObservable.addOnce(() => exports.onStart!(object));
            }

            if (exports.onUpdate) {
                scene.onBeforeRenderObservable.add(() => exports.onUpdate!(object));
            }
        }
    });

    object.metadata.scripts = undefined;
}
