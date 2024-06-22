"use client";

import { Grid } from "react-loader-spinner";
import { useEffect, useRef, useState } from "react";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader";

import "@babylonjs/core/Cameras/universalCamera";

import "@babylonjs/core/Meshes/groundMesh";
import "@babylonjs/core/Meshes/instancedMesh";

import "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

import "@babylonjs/core/Materials/PBR/pbrMaterial";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";

import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import "@babylonjs/core/Engines/Extensions/engine.textureSelector";
import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader";

import "@babylonjs/materials/sky";

import { loadScene } from "babylonjs-editor-tools";

import { Tween } from "@/tween/tween";

import { LandingPostProcess } from "@/post-process/landing";

/**
 * We import the map of all scripts attached to objects in the editor.
 * This will allow the loader from `babylonjs-editor-tools` to attach the scripts to the
 * loaded objects (scene, meshes, transform nodes, lights, cameras, etc.).
 */
import { scriptsMap } from "@/scripts";

export interface ILandingRendererComponent {
    postProcessVisible: boolean;
}

export function LandingRendererComponent(props: ILandingRendererComponent) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [ready, setReady] = useState(false);

    const [lightsPostProcess, setLightsPostProcess] = useState<LandingPostProcess | null>(null);
    const [circlePostProcess, setCirclePostProcess] = useState<LandingPostProcess | null>(null);

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
        // engine.setTextureFormatToUse(["-astc.ktx", "-dxt.ktx", "-pvrtc.ktx", "-etc1.ktx", "-etc2.ktx"]);

        const scene = new Scene(engine);

        Tween.Scene = scene;

        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.ForceFullSceneLoadingForIncremental = true;

        loadScene("/scene/", "example.babylon", scene, scriptsMap).then(() => {
            if (scene.activeCamera) {
                setLightsPostProcess(new LandingPostProcess(scene.activeCamera, "landingLights"));
                setCirclePostProcess(new LandingPostProcess(scene.activeCamera, "landingCircle"));
            }

            scene.executeWhenReady(() => {
                setReady(true);

                engine.runRenderLoop(() => {
                    scene.render();
                });
            });
        });

        let listener: () => void;
        window.addEventListener("resize", listener = () => {
            engine.resize();
        });

        return () => {
            scene.dispose();
            engine.dispose();

            window.removeEventListener("resize", listener);
        };
    }, [canvasRef]);

    useEffect(() => {
        if (!lightsPostProcess || !circlePostProcess) {
            return;
        }

        Tween.Create(lightsPostProcess, 0.5, {
            killAllTweensOfTarget: true,
            "alpha": props.postProcessVisible ? 1 : 0,
        });
        Tween.Create(circlePostProcess, 0.5, {
            killAllTweensOfTarget: true,
            "alpha": props.postProcessVisible ? 1 : 0,
        });
    }, [lightsPostProcess, circlePostProcess, props.postProcessVisible]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                className={`w-full h-full outline-none select-none ${props.postProcessVisible ? "blur-lg scale-125 lg:scale-150" : ""} transition-all duration-1000 ease-in-out`}
            />

            <div
                className={`
                    absolute top-0 left-0 w-full h-full bg-black transition-all duration-1000 ease-in-out
                    ${ready ? "opacity-0" : "opacity-100"}
                `}
            >
                <Grid
                    width={24}
                    height={24}
                    color="#ffffff"
                    wrapperClass="absolute right-5 bottom-5 pointer-events-none"
                />
            </div>
        </div>
    );
}
