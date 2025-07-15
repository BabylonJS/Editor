"use client";

import { useSearchParams } from "next/navigation";

import { useEffect, useRef } from "react";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

import HavokPhysics from "@babylonjs/havok";

import { loadScene } from "babylonjs-editor-tools";

import { scriptsMap } from "@/scripts";

import "@babylonjs/core";
import "@babylonjs/materials";

export default function DebugPage() {
	const params = useSearchParams();

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
			disableWebGL2Support: false,
			useHighPrecisionFloats: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
		});

		const scene = new Scene(engine);

		handleLoad(engine, scene);

		let listener: () => void;
		window.addEventListener("resize", listener = () => {
			engine.resize();
		});

		return () => {
			scene.dispose();
			engine.dispose();

			window.removeEventListener("resize", listener);
		};
	}, []);

	async function handleLoad(engine: Engine, scene: Scene) {
		const havok = await HavokPhysics();
		scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));

		console.log(params);
		SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
		await loadScene("/scene/", params.get("scene")!, scene, scriptsMap, {
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
		<main className="w-screen h-screen overflow-hidden">
			<canvas
				ref={canvasRef}
				className="w-full h-full outline-none select-none"
			/>
		</main>
	);
}
