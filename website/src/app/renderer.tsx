"use client";

import isMobile from "is-mobile";

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

import "@babylonjs/core/Lights/pointLight";
import "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/standardMaterial";

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
    scrollRatio: number;
    postProcessVisible: boolean;
}

export function LandingRendererComponent(props: ILandingRendererComponent) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [ready, setReady] = useState(false);
    const [mobile, setMobile] = useState<boolean | null>(false);

    const [scene, setScene] = useState<Scene | null>(null);

    const [lightsPostProcess, setLightsPostProcess] = useState<LandingPostProcess | null>(null);
    const [circlePostProcess, setCirclePostProcess] = useState<LandingPostProcess | null>(null);

    useEffect(() => {
        setMobile(isMobile());
    }, []);

    useEffect(() => {
        if (!canvasRef.current || mobile === null) {
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

        // engine.setTextureFormatToUse([
        //     "-dxt.ktx",
        //     "-astc.ktx",
        //     "-pvrtc.ktx",
        //     "-etc1.ktx",
        //     "-etc2.ktx",
        // ]);

        const scene = new Scene(engine);

        Tween.Scene = scene;

        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.ForceFullSceneLoadingForIncremental = false;

        loadScene("/scene/", "landing.babylon", scene, scriptsMap).then(() => {
            if (scene.activeCamera && !mobile) {
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

        setScene(scene);

        return () => {
            scene.dispose();
            engine.dispose();

            window.removeEventListener("resize", listener);
        };
    }, [canvasRef, mobile]);

    useEffect(() => {
        if (lightsPostProcess && circlePostProcess) {
            Tween.Create(lightsPostProcess, 0.5, {
                killAllTweensOfTarget: true,
                "alpha": props.postProcessVisible ? 1 : 0,
            });
            Tween.Create(circlePostProcess, 0.5, {
                killAllTweensOfTarget: true,
                "alpha": props.postProcessVisible ? 1 : 0,
            });
        }

        if (mobile && scene) {
            Tween.Create(scene.imageProcessingConfiguration, 0.5, {
                "exposure": props.postProcessVisible ? 0 : 1,
            });
        }
    }, [scene, lightsPostProcess, circlePostProcess, props.postProcessVisible]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                style={{
                    filter: (props.postProcessVisible && !mobile) ? `blur(16px) hue-rotate(${(180 * props.scrollRatio).toFixed(0)}deg)` : "blur(0px)",
                }}
                className={`
                    w-full h-full outline-none select-none
                    ${props.postProcessVisible ? "scale-125 lg:scale-150" : ""}
                    transition-all duration-1000 ease-in-out
                `}
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
