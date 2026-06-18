<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";

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
import { scriptsMap } from "@/scripts";

const canvasRef = ref<HTMLCanvasElement | null>(null);

let engine: Engine | null = null;
let scene: Scene | null = null;
let resizeListener: (() => void) | null = null;

async function handleLoad(engine: Engine, scene: Scene) {
	const havok = await HavokPhysics();
	scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));

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

onMounted(() => {
	if (!canvasRef.value) {
		return;
	}

	engine = new Engine(canvasRef.value, true, {
		stencil: true,
		antialias: true,
		audioEngine: true,
		adaptToDeviceRatio: true,
		disableWebGL2Support: false,
		useHighPrecisionFloats: true,
		powerPreference: "high-performance",
		failIfMajorPerformanceCaveat: false,
	});

	scene = new Scene(engine);

	handleLoad(engine, scene);

	resizeListener = () => {
		engine?.resize();
	};
	window.addEventListener("resize", resizeListener);
});

onBeforeUnmount(() => {
	scene?.dispose();
	engine?.dispose();

	if (resizeListener) {
		window.removeEventListener("resize", resizeListener);
	}
});
</script>

<template>
	<main class="app-root">
		<canvas ref="canvasRef" class="app-canvas" />
	</main>
</template>

<style>
html,
body,
#__nuxt {
	margin: 0;
	padding: 0;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
}

.app-root {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
	width: 100vw;
	height: 100vh;
}

.app-canvas {
	width: 100%;
	height: 100%;
	outline: none;
	user-select: none;
}
</style>
