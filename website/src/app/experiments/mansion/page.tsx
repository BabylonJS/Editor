"use client";

import { Component, ReactNode } from "react";

import isMobile from "is-mobile";

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

import { LoaderComponent } from "./loader";
import { MainMenuComponent } from "./menu";
import { BlackBarsComponent } from "./black-bars";
import { CinematicComponent } from "./cinematic";

export type ExperimentStep = "menu" | "menu-exit" | "cinematic";

const rootUrl = process.env.MANSION_EXPERIMENT_ROOT_URL ?? "https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/mansion/";

export default function MansionExperimentPage() {
    return (
        <main className="relative w-screen h-screen">
            <MansionExperimentComponent />
        </main>
    );
}

interface IMansionExperimentComponentState {
    loading: boolean;
    loadingProgress: number;

    step: ExperimentStep;
}

class MansionExperimentComponent extends Component<unknown, IMansionExperimentComponentState> {
    private _canvas: HTMLCanvasElement = null!;

    private _engine: Engine = null!;
    private _scene: Scene = null!;

    private _resizeListener: () => void = null!;

    private _mainMenuComponents: MainMenuComponent = null!;
    private _cinematicComponents: CinematicComponent = null!;

    public constructor(props: unknown) {
        super(props);

        this.state = {
            step: "menu",

            loading: true,
            loadingProgress: 0,
        };
    }

    public render(): ReactNode {
        return (
            <>
                <canvas ref={(r) => this._canvas = r!} className="w-full h-full outline-none border-none select-none" />

                <MainMenuComponent
                    step={this.state.step}
                    onStart={() => this._handleStart()}
                    ref={(r) => this._mainMenuComponents = r!}
                />

                <CinematicComponent
                    ref={(r) => this._cinematicComponents = r!}
                />

                <BlackBarsComponent />
                <LoaderComponent
                    loading={this.state.loading}
                    progress={this.state.loadingProgress}
                />
            </>
        );
    }

    public componentDidMount(): void {
        this._engine = new Engine(this._canvas, true, {
            stencil: true,
            antialias: true,
            audioEngine: true,
            adaptToDeviceRatio: !isMobile(),
            premultipliedAlpha: false,
            disableWebGL2Support: false,
            preserveDrawingBuffer: true,
            useHighPrecisionFloats: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
        });

        configureEngineToUseCompressedTextures(this._engine);

        SceneLoader.ShowLoadingScreen = false;
        SceneLoader.ForceFullSceneLoadingForIncremental = true;

        Tween.defaultEasing = {
            type: new CubicEase(),
            mode: CubicEase.EASINGMODE_EASEINOUT,
        };

        window.addEventListener("resize", this._resizeListener = () => {
            this._engine.resize();
        });

        switch (this.state.step) {
            case "menu":
                this._loadMainMenu();
                break;

            case "cinematic":
                this._loadCinematic();
                break;
        }
    }

    public componentWillUnmount(): void {
        this._scene?.dispose();
        this._engine?.dispose();

        window.removeEventListener("resize", this._resizeListener);
    }

    private async _loadMainMenu(): Promise<void> {
        this.setState({
            step: "menu",

            loading: true,
            loadingProgress: 0,
        });

        await this._disposeCurrentScene();
        await loadScene(rootUrl, "menu.babylon", this._scene, scriptsMap, {
            quality: isMobile() ? "low" : "high",
            onProgress: (loadingProgress) => this.setState({ loadingProgress }),
        });

        this._forceCompileAllMaterials();

        this._scene.animationGroups.forEach((animationGroup) => {
            animationGroup.play(true);
        });

        this._scene.executeWhenReady(async () => {
            this.setState({
                loading: false,
            });

            await Tween.wait(1);

            Tween.create(getDefaultRenderingPipeline()!.imageProcessing, 3, {
                "exposure": { from: 0, to: 1 },
            });

            this._mainMenuComponents.show();

            this._engine.runRenderLoop(() => {
                this._scene.render();
            });
        });
    }

    private async _handleStart(): Promise<void> {
        this.setState({
            step: "menu-exit",
        });

        this._mainMenuComponents.hideStartButton();

        await Tween.create(getDefaultRenderingPipeline()!.imageProcessing, 3, {
            exposure: 0,
        });

        await this._mainMenuComponents.hideTitle();

        this._loadCinematic();
    }

    private async _loadCinematic(): Promise<void> {
        this.setState({
            step: "cinematic",

            loading: true,
            loadingProgress: 0,
        });

        await this._disposeCurrentScene();
        await loadScene(rootUrl, "outside.babylon", this._scene, scriptsMap, {
            quality: isMobile() ? "low" : "high",
            onProgress: (loadingProgress) => this.setState({ loadingProgress }),
        });

        this._forceCompileAllMaterials();

        const response = await fetch(`${rootUrl}assets/cinematic.cinematic`);
        const data = await response.json();
        const cinematic = parseCinematic(data, this._scene);

        this._scene.executeWhenReady(async () => {
            this.setState({
                loading: false,
            });

            const group = generateCinematicAnimationGroup(cinematic, this._scene);
            group.play(false);

            setTimeout(() => {
                this._cinematicComponents.showIntro();
            }, 2000);

            setTimeout(() => {
                this._cinematicComponents.hideIntro();
            }, 9000);

            setTimeout(() => {
                this._cinematicComponents.showVideo();
            }, 11000);

            setTimeout(async () => {
                this._cinematicComponents.hideVideo();
            }, 19000);

            this._engine.runRenderLoop(() => {
                this._scene.render();
            });
        });
    }

    private async _disposeCurrentScene(): Promise<void> {
        disposeSSAO2RenderingPipeline();
        disposeDefaultRenderingPipeline();
        disposeMotionBlurPostProcess();
        disposeVLSPostProcess(this._scene);
        disposeSSRRenderingPipeline();

        this._scene?.dispose();
        this._engine.stopRenderLoop();

        this._scene = new Scene(this._engine);

        Tween.scene = this._scene;

        const havok = await HavokPhysics();
        this._scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));
    }

    private _forceCompileAllMaterials(): void {
        this._scene.materials.forEach((material) => {
            const bindedMeshes = material.getBindedMeshes();
            bindedMeshes.forEach((mesh) => {
                material.forceCompilation(mesh, undefined, {
                    useInstances: mesh.hasInstances,
                });
            });
        });
    }
}
