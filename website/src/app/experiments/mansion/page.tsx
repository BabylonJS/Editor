"use client";

import { useEffect, useRef, useState } from "react";

import isMobile from "is-mobile";
import { Grid } from "react-loader-spinner";

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

import "@babylonjs/core/Materials/PBR";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/XR/features/WebXRDepthSensing";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";

import "@babylonjs/core/Engines/Extensions/engine.textureSelector";
import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import "@babylonjs/core/Physics/physicsEngineComponent";

import "@babylonjs/core/Audio";

import "@babylonjs/materials/sky";

import {
    loadScene, configureEngineToUseCompressedTextures, generateCinematicAnimationGroup, parseCinematic,
    disposeDefaultRenderingPipeline, disposeSSAO2RenderingPipeline, disposeMotionBlurPostProcess, disposeVLSPostProcess, disposeSSRRenderingPipeline,
    getDefaultRenderingPipeline,
} from "babylonjs-editor-tools";

/**
 * We import the map of all scripts attached to objects in the editor.
 * This will allow the loader from `babylonjs-editor-tools` to attach the scripts to the
 * loaded objects (scene, meshes, transform nodes, lights, cameras, etc.).
 */
import { scriptsMap } from "@/scripts";

import { Tween } from "@/tween/tween";

const rootUrl = process.env.MANSION_EXPERIMENT_ROOT_URL ?? "https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/mansion/";

export default function MansionExperimentPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const titleRef = useRef<HTMLDivElement>(null);
    const startButtonRef = useRef<HTMLButtonElement>(null);

    const introRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [engine, setEngine] = useState<Engine | null>(null);

    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<"menu" | "cinematic">("menu");

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

        setEngine(engine);
        configureEngineToUseCompressedTextures(engine);

        let resizeListener: () => void;
        window.addEventListener("resize", resizeListener = () => {
            engine.resize();
        });

        return () => {
            engine.dispose();
            window.removeEventListener("resize", resizeListener);
        };
    }, []);

    useEffect(() => {
        if (!engine) {
            return;
        }

        setLoading(true);

        const scene = new Scene(engine);

        configureEngineToUseCompressedTextures(engine);

        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.ForceFullSceneLoadingForIncremental = true;

        Tween.Scene = scene;
        Tween.DefaultEasing = {
            type: new CubicEase(),
            mode: CubicEase.EASINGMODE_EASEINOUT,
        };

        switch (step) {
            case "menu":
                handleLoadMenu(engine, scene);
                break;

            case "cinematic":
                handleLoadCinematic(scene);
                break;
        }

        return () => {
            disposeSSAO2RenderingPipeline();
            disposeDefaultRenderingPipeline();
            disposeMotionBlurPostProcess();
            disposeVLSPostProcess(scene);
            disposeSSRRenderingPipeline();

            scene.dispose();
            engine.stopRenderLoop();
        };
    }, [step, engine]);

    useEffect(() => {
        if (step === "cinematic") {
            // TODO: load cinematic
        }
    }, [step]);

    async function setupHavok(scene: Scene) {
        const havok = await HavokPhysics();
        scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));
    }

    async function handleLoadMenu(engine: Engine, scene: Scene) {
        await setupHavok(scene);
        await loadScene(rootUrl, "menu.babylon", scene, scriptsMap, isMobile() ? "low" : "high");

        scene.animationGroups.forEach((animationGroup) => {
            animationGroup.play(true);
        });

        scene.executeWhenReady(async () => {
            setLoading(false);

            Tween.Create(getDefaultRenderingPipeline()!.imageProcessing, 3, {
                "exposure": { from: 0, to: 1 },
            });

            engine.runRenderLoop(() => {
                scene.render();
            });
        });

        Tween.CreateForCSS(titleRef.current!, 3, {
            "opacity": { from: 0, to: 1 },
        });

        Tween.CreateForCSS(startButtonRef.current!, 1, {
            delay: 3,
            "opacity": { from: 0, to: 1, },
        });
    }

    async function handleExitMenu() {
        await Promise.all([
            Tween.Create(getDefaultRenderingPipeline()!.imageProcessing, 3, {
                exposure: 0,
            }),
            Tween.CreateForCSS(startButtonRef.current!, 1, {
                "opacity": { from: 1, to: 0 },
            }),
        ]);

        await Tween.CreateForCSS(titleRef.current!, 3, {
            "opacity": { from: 1, to: 0 },
        });

        setStep("cinematic");
    }

    async function handleLoadCinematic(scene: Scene) {
        await setupHavok(scene);
        await loadScene(rootUrl, "outside.babylon", scene, scriptsMap, isMobile() ? "low" : "high");

        const response = await fetch(`${rootUrl}assets/cinematic.cinematic`);
        const data = await response.json();
        const cinematic = parseCinematic(data, scene);

        scene.executeWhenReady(async () => {
            setLoading(false);

            const group = generateCinematicAnimationGroup(cinematic, scene);
            group.play(false);

            setTimeout(() => {
                Tween.CreateForCSS(introRef.current!, 1, {
                    "opacity": { from: 0, to: 1 },
                });
            }, 2000);

            setTimeout(() => {
                Tween.CreateForCSS(introRef.current!, 2, {
                    "opacity": { from: 1, to: 0 },
                });
            }, 9000);

            setTimeout(() => {
                videoRef.current!.style.visibility = "visible";
                videoRef.current!.play();

                Tween.CreateForCSS(videoRef.current!, 0.5, {
                    "opacity": { from: 0, to: 1 },
                });
            }, 11000);

            setTimeout(async () => {
                await Tween.CreateForCSS(videoRef.current!, 3, {
                    "opacity": { from: 1, to: 0 },
                    onComplete: () => videoRef.current!.style.visibility = "hidden",
                });
            }, 19000);

            engine!.runRenderLoop(() => {
                scene.render();
            });
        });
    }

    return (
        <main className="relative w-screen h-screen">
            <canvas ref={canvasRef} className="w-full h-full outline-none border-none select-none" />

            <div className="absolute top-1/2 lg:top-1/3 left-1/2 lg:left-3/4 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-5">
                <div ref={titleRef} className="text-5xl md:text-9xl font-semibold text-white font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter opacity-0">
                    Mansion
                </div>

                <button
                    ref={startButtonRef}
                    onClick={() => handleExitMenu()}
                    className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2 opacity-0"
                >
                    Start
                </button>
            </div>

            <div ref={introRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex flex-col justify-center items-center gap-10 opacity-0 pointer-events-none">
                <div className="text-white text-center w-full text-sm md:text-base lg:text-xl 2xl:text-3xl">
                    May contain content inappropriate for children. The following cinematic is a proof of
                    <br />
                    concept, created entirely in real-time using Babylon.js Editor.
                </div>

                <div className="text-white italic text-center w-full text-sm md:text-base lg:text-xl 2xl:text-3xl">
                    Experience the power of web-based rendering—crafted without a single line of code.
                </div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none">
                <video
                    muted
                    ref={videoRef}
                    className="w-full h-full object-cover pointer-events-none invisible"
                    src="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/Babylonjs_introBumper.mp4"
                />
            </div>

            <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none">
                <img
                    src="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/UHD_235.png"
                    className="w-full h-full object-cover pointer-events-none"
                />
            </div>

            <div
                className={`
                    absolute top-0 left-0 w-full h-full bg-black pointer-events-none
                    ${loading ? "opacity-100" : "opacity-0"}
                    transition-all duration-1000 ease-in-out
                `}
            >
                <Grid
                    width={24}
                    height={24}
                    color="#ffffff"
                    wrapperClass="absolute right-5 bottom-5 pointer-events-none"
                />
            </div>
        </main>
    );
}
