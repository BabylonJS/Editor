"use client";

import { useEffect, useRef } from "react";

import {
	createEngine,
	createHavokWorld,
	disposeEngine,
	disposeScene,
	EngineContext,
	resizeEngine,
	SceneContext,
	setPhysicsVelocityLimits,
	startEngine,
	stopEngine,
} from "@babylonjs/lite";

import HavokPhysics from "@babylonjs/havok";

import { attachCameraControl, createEditorSceneContext, loadScene } from "babylonjs-editor-tools-lite";

/**
 * We import the map of all scripts attached to objects in the editor.
 * This will allow the loader from `babylonjs-editor-tools-lite` to attach the scripts to the
 * loaded objects (scene, meshes, transform nodes, lights, cameras, etc.).
 */
import { scriptsMap } from "@/scripts";

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		let engine: EngineContext | null = null;
		let scene: SceneContext | null = null;
		let detachCameraControl: (() => void) | null = null;

		// Babylon Lite renders using WebGPU only: the engine is created asynchronously. When the component is unmounted
		// while loading, the engine and the scene are disposed once loaded.
		let loading = true;
		let unmounted = false;

		function dispose() {
			detachCameraControl?.();

			if (engine) {
				stopEngine(engine);
			}

			if (scene) {
				disposeScene(scene);
			}

			if (engine) {
				disposeEngine(engine);
			}
		}

		handleLoad(canvas, (createdEngine, createdScene) => {
			engine = createdEngine;
			scene = createdScene;
		})
			.then((detach) => {
				detachCameraControl = detach;
			})
			.catch((e) => {
				console.error("Failed to load the scene.", e);
			})
			.finally(() => {
				loading = false;

				if (unmounted) {
					dispose();
				}
			});

		let listener: () => void;
		window.addEventListener(
			"resize",
			(listener = () => {
				if (engine) {
					resizeEngine(engine);
				}
			})
		);

		return () => {
			unmounted = true;

			if (!loading) {
				dispose();
			}

			window.removeEventListener("resize", listener);
		};
	}, [canvasRef]);

	async function handleLoad(canvas: HTMLCanvasElement, onCreated: (engine: EngineContext, scene: SceneContext) => void) {
		const engine = await createEngine(canvas);
		const scene = createEditorSceneContext(engine);

		onCreated(engine, scene);

		const havok = await HavokPhysics();
		const physicsWorld = createHavokWorld(scene, havok, { x: 0, y: -981, z: 0 });
		// Scenes are in centimeters: Havok limits the linear velocity to 200 units/s by default, which is only 2 m/s. Raise it to 200 m/s.
		setPhysicsVelocityLimits(physicsWorld, 200 * 100, 100);

		await loadScene("/scene/", "example.babylon", scene, scriptsMap, {
			quality: "high",
			physicsWorld,
		});

		const detachCameraControl = scene.camera ? attachCameraControl(scene.camera, scene, canvas) : null;

		await startEngine(engine);

		return detachCameraControl;
	}

	return (
		<main className="flex w-screen h-screen flex-col items-center justify-between">
			<canvas ref={canvasRef} className="w-full h-full outline-none select-none" />
		</main>
	);
}
