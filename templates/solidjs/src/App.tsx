import { Component, onMount, onCleanup } from "solid-js";

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

const App: Component = () => {
	let canvasRef: HTMLCanvasElement | undefined;

	onMount(() => {
		if (!canvasRef) {
			return;
		}

		const engine = new Engine(canvasRef, true, {
			stencil: true,
			antialias: true,
			audioEngine: true,
			adaptToDeviceRatio: true,
			disableWebGL2Support: false,
			useHighPrecisionFloats: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
		});

		const scene = new Scene(engine);

		handleLoad(engine, scene);

		const handleResize = () => {
			engine.resize();
		};

		window.addEventListener("resize", handleResize);

		onCleanup(() => {
			scene.dispose();
			engine.dispose();
			window.removeEventListener("resize", handleResize);
		});
	});

	async function handleLoad(engine: Engine, scene: Scene) {
		const havok = await HavokPhysics();
		const gravityVector = new Vector3(0, -9.81, 0);
		const physicsPlugin = new HavokPlugin(true, havok);
		scene.enablePhysics(gravityVector, physicsPlugin);

		SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
		await loadScene("/scene/", "example.babylon", scene, scriptsMap, {
			quality: "high",
		});

		if (scene.activeCamera) {
			scene.activeCamera.attachControl();
		}

		engine.runRenderLoop(() => {
			scene.render();
		});
	}

	return (
		<main class="flex w-screen h-screen flex-col items-center justify-between">
			<canvas
				ref={(r) => (canvasRef = r)}
				class="w-full h-full outline-none select-none"
			/>
		</main>
	);
};

export default App;
