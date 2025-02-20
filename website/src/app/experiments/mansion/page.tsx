"use client";

import { useEffect, useRef } from "react";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CubicEase } from "@babylonjs/core/Animations/easing";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

import HavokPhysics from "@babylonjs/havok";

import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader";

import "@babylonjs/core/Cameras/universalCamera";

import "@babylonjs/core/Meshes/groundMesh";
import "@babylonjs/core/Meshes/instancedMesh";

import "@babylonjs/core/Particles/particleSystemComponent";

import "@babylonjs/core/Audio/audioSceneComponent";

import "@babylonjs/core/Lights/pointLight";
import "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/XR/features/WebXRDepthSensing";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";

import "@babylonjs/core/Engines/Extensions/engine.textureSelector";
import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import "@babylonjs/core/Physics/physicsEngineComponent";

import "@babylonjs/materials/sky";

import { loadScene, configureEngineToUseCompressedTextures } from "babylonjs-editor-tools";

/**
 * We import the map of all scripts attached to objects in the editor.
 * This will allow the loader from `babylonjs-editor-tools` to attach the scripts to the
 * loaded objects (scene, meshes, transform nodes, lights, cameras, etc.).
 */
import { scriptsMap } from "@/scripts";

import { Tween } from "@/tween/tween";

export default function MansionExperimentPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const engine = new Engine(canvasRef.current, true, {
            stencil: true,
            antialias: true,
            audioEngine: true,
            adaptToDeviceRatio: true,
            premultipliedAlpha: false,
            disableWebGL2Support: false,
            preserveDrawingBuffer: true,
            useHighPrecisionFloats: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
        });

        const scene = new Scene(engine);

        // configureEngineToUseCompressedTextures(engine);

        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.ForceFullSceneLoadingForIncremental = false;

        Tween.Scene = scene;
        Tween.DefaultEasing = {
            type: new CubicEase(),
            mode: CubicEase.EASINGMODE_EASEINOUT,
        };

        handleLoad(engine, scene);

        let resizeListener: () => void;
        window.addEventListener("resize", resizeListener = () => {
            engine.resize();
        });

        return () => {
            window.removeEventListener("resize", resizeListener);
        };
    }, []);

    async function handleLoad(engine: Engine, scene: Scene) {
        const havok = await HavokPhysics();
        scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));

        await loadScene(
            "https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/mansion/",
            "outside.babylon",
            scene,
            scriptsMap,
            "high",
        );

        scene.animationGroups.forEach((animationGroup) => {
            animationGroup.play(true);
        });

        scene.executeWhenReady(() => {
            scene.activeCamera?.attachControl();

            engine.runRenderLoop(() => {
                scene.render();
            });
        });
    }

    return (
        <main className="w-screen h-screen">
            <canvas ref={canvasRef} className="w-full h-full outline-none border-none select-none" />
        </main>
    );
}
