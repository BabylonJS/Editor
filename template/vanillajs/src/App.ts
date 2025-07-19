import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

import HavokPhysics from "@babylonjs/havok";

import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader";

import "@babylonjs/core/Cameras/universalCamera";

import "@babylonjs/core/Meshes/groundMesh";

import "@babylonjs/core/Lights/directionalLight";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/XR/features/WebXRDepthSensing";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";

import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import "@babylonjs/core/Physics";

import "@babylonjs/materials/sky";

import { loadScene } from "babylonjs-editor-tools";

/**
 * We import the map of all scripts attached to objects in the editor.
 * This will allow the loader from `babylonjs-editor-tools` to attach the scripts to the
 * loaded objects (scene, meshes, transform nodes, lights, cameras, etc.).
 */
import { scriptsMap } from "./scripts";

export class App {
  private canvas: HTMLCanvasElement;
  private engine: Engine | null = null;
  private scene: Scene | null = null;

  constructor() {
    const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvasElement) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasElement;
  }

  public async init(): Promise<void> {
    this.engine = new Engine(this.canvas, true, {
      stencil: true,
      antialias: true,
      audioEngine: true,
      adaptToDeviceRatio: true,
      disableWebGL2Support: false,
      useHighPrecisionFloats: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });

    this.scene = new Scene(this.engine);

    await this.handleLoad();

    // Handle window resize
    const handleResize = () => {
      this.engine?.resize();
    };

    window.addEventListener("resize", handleResize);

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
  }

  private async handleLoad(): Promise<void> {
    if (!this.engine || !this.scene) return;

    const havok = await HavokPhysics();
    this.scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));

    SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
    await loadScene("/scene/", "example.babylon", this.scene, scriptsMap, {
      quality: "high",
    });

    if (this.scene.activeCamera) {
      this.scene.activeCamera.attachControl();
    }
  }

  public dispose(): void {
    this.scene?.dispose();
    this.engine?.dispose();
  }
} 
